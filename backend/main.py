from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Any
import sentry_sdk
import uuid

sentry_sdk.init(
    dsn="https://a12ba8384ace7dcd3527a7a097d2c781@o4511279964618752.ingest.us.sentry.io/4511280177938432",
    send_default_pii=True,
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)
import json
import os
import sys
import asyncio
from datetime import datetime, timedelta

# Ensure the backend directory is in the path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database as db
import anilist as al

app = FastAPI(title="Anime Tracker API")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount static files to serve uploaded images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    file_ext = os.path.splitext(file.filename)[1]
    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"url": f"/uploads/{new_filename}"}

@app.get("/debug-sentry")
async def trigger_error():
    division_by_zero = 1 / 0
    return {"message": "You should not see this!"}

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"!!! [BACKEND 422] Validation Error at {request.url.path} !!!")
    print(f"Details: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Setup CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    db.init_db()
    # Start the background cleanup
    asyncio.create_task(cleanup_activity_task())

# --- Auth Models ---
class UserRegister(BaseModel):
    username: str
    password: str
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/api/auth/register")
def register(user: UserRegister):
    success = db.add_user(user.username, user.password, user.email)
    if success:
        return {"message": "User created successfully"}
    raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/api/auth/login")
def login(user: UserLogin):
    success = db.login_user(user.username, user.password)
    if success:
        return {"message": "Login successful", "username": user.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- User Profile ---
class ThemeUpdate(BaseModel):
    username: str
    theme_url: str

@app.get("/api/user/theme")
def get_theme(username: str):
    theme = db.get_user_theme(username)
    return {"theme_url": theme}

@app.post("/api/user/theme")
def update_theme(data: ThemeUpdate):
    db.set_user_theme(data.username, data.theme_url)
    return {"message": "Theme updated"}

# --- Anime APIs ---
@app.get("/api/anime/discover")
def discover_anime(mode: str = "search", query: Optional[str] = None, genre: Optional[str] = None, page: int = 1):
    genres = [genre] if genre else None
    data, page_info = al.fetch_anilist(query=query, mode=mode, genres=genres, page=page)
    return {"data": data, "pageInfo": page_info}

@app.get("/api/anime/schedule")
def get_schedule(day: str):
    data = al.fetch_anilist_schedule(day)
    return {"data": data}

@app.get("/api/anime/recommendations")
def get_recommendations(username: str, page: int = 1):
    items = db.get_user_anime(username, "All")
    
    if not items:
        data, page_info = al.fetch_anilist(mode="top", perPage=24, page=page)
        return {"data": data, "pageInfo": page_info}

    # Signal Maps
    status_weights = {"Completed": 3, "Watching": 2, "Plan to Watch": 1, "Dropped": -1}
    genre_weights = {}
    tag_weights = {}
    studio_weights = {}
    user_anime_ids = set() # Stores both AniList and MAL IDs

    for item in items:
        anime_id, status, score, genres_str = item[1], item[4], item[5], item[7]
        user_anime_ids.add(anime_id)
        if item[13]: user_anime_ids.add(item[13]) # idMal
        
        # Calculate weights
        multiplier = (score / 5.0) if score > 0 else 1.0
        base_w = status_weights.get(status, 1)
        if status == "Dropped" and (item[12] if len(item) > 12 else None): base_w = -10
        final_w = base_w * multiplier

        # Genres
        if genres_str:
            for g in [x.strip() for x in genres_str.split(',') if x.strip()]:
                genre_weights[g] = genre_weights.get(g, 0) + final_w
        
        # NOTE: For deep tags and studios, we'd ideally have them in the DB.
        # Since they aren't, we rely on the genre signal mostly, but we'll 
        # apply a studio boost for very highly rated shows if we can fetch them.
        # For now, we'll focus on the Sequel Awareness and improved candidate scoring.

    # Fetch 150 candidates with relations/tags/studios
    candidates, _ = al.fetch_anilist(mode="top", perPage=150)
    
    scored_candidates = []
    for anime in candidates:
        # 1. Basic filter: already in list
        if anime['mal_id'] in user_anime_ids or (anime['idMal'] and anime['idMal'] in user_anime_ids):
            continue
            
        # 2. Sequel Awareness (Feature 5)
        is_sequel_missing_prequel = False
        for rel in anime.get('relations', []):
            if rel['relationType'] == 'PREQUEL':
                pre_id = rel['node']['id']
                pre_id_mal = rel['node']['idMal']
                if pre_id not in user_anime_ids and (not pre_id_mal or pre_id_mal not in user_anime_ids):
                    is_sequel_missing_prequel = True
                    break
        
        if is_sequel_missing_prequel:
            continue # Don't recommend Season 2 if they haven't seen S1

        # 3. Content Scoring (Features 1 & 3)
        score = 0
        # Genre boost
        for g in anime.get('genres', []):
            score += genre_weights.get(g['name'], 0)
        
        # Tag boost (Feature 1) - using a subset of genre weights as a proxy for now
        # but weighting higher ranked tags if they match genre profile
        for tag in anime.get('tags', []):
            score += (genre_weights.get(tag, 0) * 0.5)
            
        # Studio boost (Feature 3)
        # (Assuming user likes studios of their top rated shows)
        # We'll give a static boost to candidates from studios if we find matches in history
        # (This part is simplified for the demonstration)
        
        # Popularity boost
        score += (anime.get('score', 0) / 10.0)
        
        anime['_match_score'] = score
        scored_candidates.append(anime)
        
    scored_candidates.sort(key=lambda x: x['_match_score'], reverse=True)
    
    # Pagination
    per_page = 24
    total = len(scored_candidates)
    last_page = (total // per_page) + (1 if total % per_page > 0 else 0)
    start = (page - 1) * per_page
    end = start + per_page
    
    return {
        "data": scored_candidates[start:end],
        "pageInfo": { "total": total, "lastPage": last_page, "hasNextPage": page < last_page }
    }

# --- Collection ---
class AnimeSave(BaseModel):
    username: str
    anime_id: int
    title: str
    image_url: str
    status: str
    score: Optional[float] = 0.0
    episodes: Optional[int] = 0
    genres: str
    coop_friend_username: Optional[str] = None
    drop_reason: Optional[str] = None
    idMal: Optional[int] = None

def upscale_image_url(url: str) -> str:
    if not url: return url
    # Handle MyAnimeList image upscaling
    if "cdn.myanimelist.net/images/anime/" in url:
        if not url.endswith("l.jpg") and url.endswith(".jpg"):
            return url.replace(".jpg", "l.jpg")
    # Handle AniList image upscaling (already using extraLarge, but for safety)
    return url

@app.get("/api/collection")
def get_collection(username: str, status_filter: str = "All"):
    items = db.get_user_anime(username, status_filter)
    # Map tuple to dict for easy JSON parsing
    result = []
    for item in items:
        result.append({
            "username": item[0], "anime_id": item[1], "title": item[2], 
            "image_url": upscale_image_url(item[3]),
            "status": item[4], "score": item[5], "episodes": item[6], "genres": item[7],
            "review": item[8], "progress": item[9], "seasons_json": item[10],
            "coop_friend_username": item[11] if len(item) > 11 else None,
            "drop_reason": item[12] if len(item) > 12 else None,
            "idMal": item[13] if len(item) > 13 else None,
            "custom_tags": item[14] if len(item) > 14 else None,
            "private_notes": item[15] if len(item) > 15 else None,
            "score_story": item[16] if len(item) > 16 else None,
            "score_art": item[17] if len(item) > 17 else None,
            "score_sound": item[18] if len(item) > 18 else None,
            "series_name": item[19] if len(item) > 19 else None,
        })
    return {"data": result}

def notify_friends(username: str, message: str, anime_id: int):
    friends = db.get_friends(username)
    for friend in friends:
        db.create_notification(friend, message, anime_id)

@app.post("/api/collection")
def save_collection(data: AnimeSave):
    high_res_url = upscale_image_url(data.image_url)
    db.save_anime_to_db(data.username, data.anime_id, data.title, high_res_url, 
                        data.status, data.score, data.episodes, data.genres,
                        data.coop_friend_username, data.drop_reason, data.idMal)
    db.log_activity(data.username, f'added "{data.title}" to {data.status}', data.title, data.anime_id)
    
    if data.status in ["Watching", "Completed"]:
        notify_friends(data.username, f"{data.username} started tracking {data.title}", data.anime_id)
    
    return {"message": "Saved to collection"}

class ProgressUpdate(BaseModel):
    username: str
    anime_id: int
    seasons_json: str
    episode_progress: int = 0

@app.post("/api/collection/progress")
def update_progress(data: ProgressUpdate):
    # 1. Update seasons_json (legacy compatibility)
    db.update_seasons_json(data.username, data.anime_id, data.seasons_json)
    
    # 2. Update the primary progress column and handle status transitions
    with db.get_db() as conn:
        c = conn.cursor()
        # Fetch total episodes to check for completion
        c.execute("SELECT episodes, status FROM user_anime WHERE username=? AND anime_id=?", (data.username, data.anime_id))
        row = c.fetchone()
        if row:
            total_eps = row[0] or 0
            current_status = row[1]
            
            # Update progress
            new_status = current_status
            if data.episode_progress >= total_eps and total_eps > 0:
                new_status = "Completed"
            elif data.episode_progress > 0:
                new_status = "Watching"
                
            c.execute("UPDATE user_anime SET progress=?, status=? WHERE username=? AND anime_id=?", 
                      (data.episode_progress, new_status, data.username, data.anime_id))
            conn.commit()
    
    if data.episode_progress > 0:
        db.log_watch_history(data.username, data.anime_id, data.episode_progress)
        # Find title for activity log
        items_all = db.get_user_anime(data.username, "All")
        anime_title = next((i[2] for i in items_all if i[1] == data.anime_id), 'Unknown Anime')
        db.log_activity(data.username, f'watched episode {data.episode_progress} of "{anime_title}"', anime_title, data.anime_id)
        notify_friends(data.username, f"{data.username} just watched Episode {data.episode_progress} of {anime_title}", data.anime_id)

    items = db.get_user_anime(data.username, "All")
    coop_friend = next((item[11] for item in items if item[1] == data.anime_id and len(item) > 11), None)
    
    warning = False
    if coop_friend:
        friend_progress = db.get_friend_progress(coop_friend, data.anime_id)
        if friend_progress is not None and data.episode_progress > friend_progress:
            warning = True

    return {"message": "Progress updated", "coop_warning": warning, "coop_friend": coop_friend}

class ReviewUpdate(BaseModel):
    username: str
    anime_id: int
    review: str

@app.post("/api/collection/review")
def update_review(data: ReviewUpdate):
    db.update_review(data.username, data.anime_id, data.review)
    return {"message": "Review updated"}

@app.delete("/api/collection")
def delete_collection(username: str, anime_id: int):
    db.delete_anime_from_db(username, anime_id)
    return {"message": "Deleted from collection"}

class SeriesNameUpdate(BaseModel):
    username: str
    anime_id: int
    series_name: Optional[str] = None

@app.post("/api/collection/series")
def update_series_name(data: SeriesNameUpdate):
    db.set_series_name(data.username, data.anime_id, data.series_name)
    return {"message": "Series name updated"}

# --- Community ---
class FriendAction(BaseModel):
    username: str
    friend_username: str

@app.get("/api/community/friends")
def get_friends(username: str):
    friends = db.get_friends(username)
    return {"data": friends}

@app.post("/api/community/friends")
def add_friend(data: FriendAction):
    if not db.check_user_exists(data.friend_username):
        raise HTTPException(status_code=404, detail="User not found")
    success = db.add_friend(data.username, data.friend_username)
    if success:
        return {"message": "Friend added"}
    raise HTTPException(status_code=400, detail="Already friends")

@app.delete("/api/community/friends")
def remove_friend(username: str, friend_username: str):
    db.remove_friend(username, friend_username)
    return {"message": "Friend removed"}

@app.get("/api/community/search")
def search_user(username: str):
    exists = db.check_user_exists(username)
    if exists:
        return {"message": "User found", "exists": True}
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/api/community/compare")
def compare_friend(username: str, friend_username: str):
    total_count, shared = db.get_shared_anime(username, friend_username)
    return {"total_count": total_count, "shared": shared}

# --- New Advanced Features APIs ---
import requests
import random
from datetime import datetime

@app.get("/api/user/stats/{username}")
def get_user_stats(username: str):
    # Total episodes from watch history
    with db.get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT count(*) FROM watch_history WHERE username=?', (username,))
        total_episodes = c.fetchone()[0]
        
    # Anime list metrics
    items = db.get_user_anime(username, "All")
    total_anime = len(items)
    
    total_score = 0
    scored_count = 0
    genre_counts = {}
    
    for item in items:
        # Score calculation
        score = item[5]
        if score and score > 0:
            total_score += score
            scored_count += 1
            
        # Genre distribution
        genres_str = item[7]
        if genres_str:
            for g in [x.strip() for x in genres_str.split(',') if x.strip()]:
                genre_counts[g] = genre_counts.get(g, 0) + 1
                
    mean_score = (total_score / scored_count) if scored_count > 0 else 0.0
    
    return {
        "total_anime": total_anime,
        "total_episodes": total_episodes,
        "mean_score": mean_score,
        "genre_counts": genre_counts
    }

@app.get("/api/collection/backlog")
def get_backlog(username: str):
    items = db.get_user_anime(username, "Plan to Watch")
    total_eps = sum((item[6] or 12) for item in items)
    
    # Assume 5 eps a week if no history
    with db.get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT count(*) FROM watch_history WHERE username=?', (username,))
        history_count = c.fetchone()[0]
    
    eps_per_week = max((history_count / 4.0), 5.0) 
    weeks_to_clear = total_eps / eps_per_week
    
    roulette = None
    if items:
        r_item = random.choice(items)
        roulette = {
            "anime_id": r_item[1], "title": r_item[2], "image_url": r_item[3], "episodes": r_item[6], "genres": r_item[7]
        }
        
    return {
        "total_unwatched_episodes": total_eps,
        "estimated_weeks_to_clear": round(weeks_to_clear, 1),
        "roulette_pick": roulette
    }

@app.get("/api/collection/export")
def export_collection(username: str):
    items = db.get_user_anime(username, "All")
    # Transform into clean object list for JSON export
    export_data = []
    for item in items:
        export_data.append({
            "id": item[0],
            "anime_id": item[1],
            "title": item[2],
            "image_url": item[3],
            "status": item[4],
            "score": item[5],
            "episodes": item[6],
            "genres": item[7],
            "series_name": item[8]
        })
    return export_data

@app.get("/api/anime/details/{media_id}")
def get_anime_details(media_id: int):
    # 1. Try Jikan first (as original code relied on it)
    try:
        r = requests.get(f"https://api.jikan.moe/v4/anime/{media_id}/full", timeout=8)
        if r.status_code == 200:
            data = r.json().get('data')
            if data:
                # Augment Jikan data with characters/staff if they aren't in /full
                if not data.get('characters'):
                    c_res = requests.get(f"https://api.jikan.moe/v4/anime/{media_id}/characters", timeout=5)
                    if c_res.status_code == 200: data['characters'] = c_res.json().get('data', [])
                
                # IMPORTANT: Fetch external links and airing info from AniList even if Jikan succeeds
                # This ensures the Tactical HUD is always populated with high-quality intelligence
                al_extra = al.fetch_anilist_media(media_id, is_mal=True)
                if al_extra:
                    data['external_links'] = al_extra.get('external_links', [])
                    data['next_airing'] = al_extra.get('next_airing')
                else:
                    # Fallback to Jikan's own external links if AniList fails
                    data['external_links'] = [{"site": ex['name'], "url": ex['url'], "type": "Official"} for ex in data.get('external', [])]
                
                return {"data": data, "source": "jikan"}
    except Exception as e:
        print(f"Jikan augment error: {e}")
        pass

    # 2. Fallback to AniList (handles IDs that are AniList-only or if Jikan 404s)
    # We try both is_mal=True and False
    al_data = al.fetch_anilist_media(media_id, is_mal=True)
    if not al_data:
        al_data = al.fetch_anilist_media(media_id, is_mal=False)
    
    if al_data:
        return {"data": al_data, "source": "anilist"}
    
    raise HTTPException(status_code=404, detail="Anime not found in any uplink.")

@app.get("/api/anime/summary")
def get_episode_summary(idMal: int, episode: int):
    try:
        r = requests.get(f"https://api.jikan.moe/v4/anime/{idMal}/episodes/{episode}", timeout=10)
        if r.status_code == 200:
            data = r.json().get('data', {})
            synopsis = data.get('synopsis')
            if synopsis:
                return {"synopsis": synopsis}
            return {"synopsis": "No spoiler-free summary available for this episode."}
        return {"synopsis": "Could not fetch summary from Jikan API."}
    except Exception:
        return {"synopsis": "Error connecting to community API."}

# ── Seasonal Charts ────────────────────────────────────────────────────────────
@app.get("/api/anime/seasonal")
def get_seasonal(year: int, season: str, page: int = 1):
    data, page_info = al.fetch_anilist_seasonal(year, season, page)
    return {"data": data, "pageInfo": page_info}

@app.get("/api/anime/top")
def get_top_anime(page: int = 1, per_page: int = 50):
    data, page_info = al.fetch_anilist_top(page, per_page)
    return {"data": data, "pageInfo": page_info}

@app.get("/api/anime/relations/smart")
def get_smart_relations(idMal: int):
    return {"data": al.fetch_anilist_relations(idMal)}

@app.get("/api/activity")
def get_activity():
    return {"data": db.get_activity_feed(50)}

@app.delete("/api/activity")
def clear_activity():
    with db.get_db() as conn:
        conn.execute("DELETE FROM activity_log")
        conn.commit()
    return {"message": "Activity feed cleared"}

async def cleanup_activity_task():
    """Background task to delete activity older than 7 days every 6 hours."""
    while True:
        try:
            with db.get_db() as conn:
                # Delete entries older than 7 days
                cutoff = (datetime.now() - timedelta(days=7)).isoformat()
                conn.execute("DELETE FROM activity_log WHERE timestamp < ?", (cutoff,))
                conn.commit()
            print(f"[Cleanup] Old activity cleared at {datetime.now()}")
        except Exception as e:
            print(f"[Cleanup Error]: {e}")
        
        await asyncio.sleep(6 * 3600) # Wait 6 hours

# ── Notifications ──────────────────────────────────────────────────────────────
@app.get("/api/notifications")
def get_notifications(username: str):
    notifications = db.get_notifications(username)
    unread = sum(1 for n in notifications if not n['is_read'])
    return {"data": notifications, "unread": unread}

class NotificationRead(BaseModel):
    username: str

@app.post("/api/notifications/read")
def mark_notifications_as_read(data: NotificationRead):
    db.mark_notifications_read(data.username)
    return {"message": "Notifications marked as read"}

# ── Custom Fields (Tags, Notes, Sub-scores) ────────────────────────────────────
class CustomFieldsUpdate(BaseModel):
    username: str
    anime_id: int
    custom_tags: Optional[str] = None
    private_notes: Optional[str] = None
    score_story: Optional[float] = None
    score_art: Optional[float] = None
    score_sound: Optional[float] = None

@app.post("/api/collection/custom")
def update_custom_fields(data: CustomFieldsUpdate):
    db.update_custom_fields(data.username, data.anime_id, data.custom_tags,
                            data.private_notes, data.score_story, data.score_art, data.score_sound)
    return {"message": "Custom fields updated"}

# ── Global Theme ───────────────────────────────────────────────────────────────
@app.get("/api/user/theme")
def get_user_theme(username: str):
    return {"theme_url": db.get_user_theme(username)}

class ThemeUpdate(BaseModel):
    username: str
    theme_url: str

@app.post("/api/user/theme")
def set_user_theme(data: ThemeUpdate):
    db.set_user_theme(data.username, data.theme_url)
    return {"message": "Theme updated"}

@app.get("/api/user/theme/seasonal")
def get_seasonal_toggle(username: str):
    return {"enabled": db.get_seasonal_theme_enabled(username)}

class SeasonalToggleUpdate(BaseModel):
    username: str
    enabled: bool

@app.post("/api/user/theme/seasonal")
def set_seasonal_toggle(data: SeasonalToggleUpdate):
    db.set_seasonal_theme_enabled(data.username, data.enabled)
    return {"message": "Seasonal theme preference updated"}

@app.get("/api/user/theme/selection")
def get_theme_selection(username: str):
    return {"selection": db.get_custom_theme_selection(username)}

class ThemeSelectionUpdate(BaseModel):
    username: str
    selection: str

@app.post("/api/user/theme/selection")
def set_theme_selection(data: ThemeSelectionUpdate):
    db.set_custom_theme_selection(data.username, data.selection)
    return {"message": "Theme selection updated"}

# ── Profile Personalization ────────────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    username: str
    banner_url: Optional[str] = None
    pfp_url: Optional[str] = None
    theme_color: Optional[str] = None
    atmosphere_url: Optional[str] = None

@app.post("/api/profile/update")
def update_profile(data: ProfileUpdate):
    db.update_user_profile(
        data.username, 
        banner_url=data.banner_url, 
        pfp_url=data.pfp_url, 
        theme_color=data.theme_color,
        atmosphere_url=data.atmosphere_url
    )
    return {"message": "Profile updated"}

# ── Public Profile ─────────────────────────────────────────────────────────────
@app.get("/api/profile/{username}")
def get_public_profile(username: str):
    profile = db.get_public_profile(username)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

# ── Data Import (MAL XML) ──────────────────────────────────────────────────────
from fastapi import UploadFile, File
import xml.etree.ElementTree as ET

from fastapi import BackgroundTasks

async def fetch_missing_metadata_task(username: str):
    """Background worker to fetch images/genres for imported MAL entries."""
    with db.get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT anime_id, idMal, title FROM user_anime WHERE username=? AND (image_url='' OR image_url IS NULL)", (username,))
        missing = c.fetchall()
        
    if not missing:
        return

    print(f"[Metadata Task] Syncing {len(missing)} titles for {username}...")
    for aid, mid, title in missing:
        try:
            # 1. Try to fetch from AniList by MAL ID first (most accurate)
            # We use mode="search" with query if idMal search fails.
            # But AniList fetcher handles mode="search". Let's use it.
            search_query = title
            # Search by title
            results, _ = al.fetch_anilist(query=search_query, mode="search", perPage=1)
            
            if results:
                best_match = results[0]
                # Update DB
                with db.get_db() as conn:
                    conn.execute("""UPDATE user_anime SET image_url=?, genres=? 
                                 WHERE username=? AND anime_id=?""",
                                 (best_match['images']['jpg']['image_url'], 
                                  ','.join([g['name'] for g in best_match['genres']]),
                                  username, aid))
            
            # Sleep slightly to avoid spamming
            await asyncio.sleep(0.5) 
        except Exception as e:
            print(f"Failed to sync metadata for {title}: {e}")

@app.post("/api/import/mal")
async def import_mal(username: str, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    content = await file.read()
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Invalid XML file")

    MAL_STATUS_MAP = {
        "Completed": "Completed",
        "Watching": "Watching",
        "Plan to Watch": "Plan to Watch",
        "Dropped": "Dropped",
        "On-Hold": "On Hold",
    }

    import_list = []
    for anime in root.findall('anime'):
        try:
            title = anime.findtext('series_title') or ''
            mal_id = int(anime.findtext('series_animedb_id') or 0)
            status_raw = anime.findtext('my_status') or ''
            status = MAL_STATUS_MAP.get(status_raw, 'Plan to Watch')
            score = float(anime.findtext('my_score') or 0)
            episodes = int(anime.findtext('series_episodes') or 0)
            watched = int(anime.findtext('my_watched_episodes') or 0)

            import_list.append({
                "anime_id": mal_id,
                "title": title,
                "image_url": "", # Will be fetched by background task
                "status": status,
                "score": score,
                "episodes": episodes,
                "progress": watched,
                "idMal": mal_id
            })
        except Exception:
            continue

    if import_list:
        stats = db.batch_import_anime(username, import_list)
        db.log_activity(username, f"imported {len(import_list)} titles from MAL", "Multiple Titles", 0)
        
        # Trigger background metadata fetch
        background_tasks.add_task(fetch_missing_metadata_task, username)
        
        return {
            "message": f"✅ Import complete! {stats['inserted']} added, {stats['updated']} merged.",
            "inserted": stats['inserted'],
            "updated": stats['updated']
        }

    return {"message": "No anime found to import."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
