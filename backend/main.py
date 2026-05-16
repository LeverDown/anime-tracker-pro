import os
import sys
import json
import asyncio
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

import uuid
import sentry_sdk
from sentry_sdk import metrics
from fastapi import FastAPI, HTTPException, File, UploadFile, BackgroundTasks, Response, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from routes.events import router as events_router
from sqlalchemy import text
from sqlalchemy import func
from typing import List, Optional, Any
from contextlib import asynccontextmanager

from core.tasks import sync_external_library_task

# Ensure the backend directory is in the path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database as db
import anilist as al
from core.metadata_engine import MetadataEngine
from core.security import get_current_user
from utils.image_utils import upscale_image_url

IS_PROD = os.getenv("NODE_ENV") == "production"
print(f"!!! [SYSTEM] Running in {'PRODUCTION' if IS_PROD else 'DEVELOPMENT'} mode (Cookie Secure: {IS_PROD}) !!!")

# Initialize Sentry
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        send_default_pii=True,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )
    # Example metrics from the tutorial
    metrics.count("checkout.failed", 1)
    metrics.gauge("queue.depth", 42)
    metrics.distribution("cart.amount_usd", 187.5)
    metrics.count("test_metric", 1)
    
    print("Sentry backend monitoring initialized with Metrics.")
else:
    print("Sentry DSN not found. Monitoring disabled.")



@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    
    # 1. Environment Validation
    REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET"]
    missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing_vars:
        raise RuntimeError(f"CRITICAL_FAILURE // Missing required environment variables: {', '.join(missing_vars)}")

    # 2. Database Migrations
    try:
        import alembic.config
        import alembic.command
        alembic_cfg = alembic.config.Config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini"))
        alembic_cfg.set_main_option("script_location", os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic"))
        alembic.command.upgrade(alembic_cfg, "head")
        print("[System] Database migrations applied successfully.")
    except Exception as e:
        print(f"[System] Alembic upgrade warning: {e}")
        # Fallback for dev environments without migrations setup
        db.init_db()
    
    yield
    
    # --- Shutdown Logic ---
    pass

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Anime Tracker API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount static files to serve uploaded images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(events_router, prefix="/api/events")
 
@app.get("/")
@app.get("//")
async def root():
    return {"message": "SENTRY_PURGE_COMPLETE_BACKEND_READY_001"}

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

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
 

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"!!! [BACKEND 422] Validation Error at {request.url.path} !!!")
    print(f"Details: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Setup CORS for Next.js frontend
frontend_origin = os.getenv("CORS_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from core.security import create_access_token, create_refresh_token, get_current_user, verify_password
import jwt
from core.security import SECRET_KEY, ALGORITHM
from utils.cache_manager import cache

# --- Auth Models ---
class UserRegister(BaseModel):
    username: str
    password: str
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

# Track failed login attempts via Redis cache manager

@app.post("/api/auth/register")
@limiter.limit("5/minute")
def register(user: UserRegister, request: Request):
    success = db.add_user(user.username, user.password, user.email)
    if success:
        return {"message": "User created successfully"}
    raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/api/auth/login")
@limiter.limit("10/minute")
def login(user: UserLogin, request: Request, response: Response):
    print(f"!!! [AUTH] Login attempt for user: {user.username} !!!")
    is_valid, needs_rehash = db.login_user(user.username, user.password)
    
    if is_valid:
        print(f"!!! [AUTH] Login SUCCESS for user: {user.username} !!!")
        
        # SEC-004: Automatic Upgrade from Legacy SHA-256
        if needs_rehash:
            from core.security import hash_password
            new_hash = hash_password(user.password)
            with db.get_db() as session:
                session.query(db.User).filter(db.User.username == user.username).update({"password": new_hash})
                session.commit()
            sentry_sdk.capture_message(f"Security: Upgraded legacy hash for user {user.username}", level="info")

        # Reset counter on success
        cache.delete(f"login_fails:{user.username}")
        access_token = create_access_token(data={"sub": user.username})
        refresh_token = create_refresh_token(data={"sub": user.username})
        
        # Set HttpOnly Cookies with global path (Adaptive Secure flag)
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=IS_PROD, samesite="lax", max_age=3600, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=IS_PROD, samesite="lax", max_age=3600*24*7, path="/")
        
        return {"message": "Login successful", "username": user.username, "access_token": access_token, "token_type": "bearer"}
    
    print(f"!!! [AUTH] Login FAILED for user: {user.username} !!!")
    # Track failed attempts via Redis
    attempts = cache.get(f"login_fails:{user.username}") or 0
    attempts += 1
    cache.set(f"login_fails:{user.username}", attempts, ttl=3600)
    
    if attempts >= 5:
        sentry_sdk.capture_message(
            f"Security Alert: Repeated failed login attempts for user {user.username}",
            level="warning"
        )
        
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/refresh")
def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    if cache.get(f"blocked_token:{token}"):
        raise HTTPException(status_code=401, detail="Token has been revoked")
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        token_type = payload.get("type")
        
        if username is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        # SEC-006: Verify user still exists in database
        with db.get_db() as session:
            db_user = session.query(db.User).filter(func.lower(db.User.username) == func.lower(username)).first()
            if not db_user:
                raise HTTPException(status_code=401, detail="Session invalid: User record not found")

        access_token = create_access_token(data={"sub": username})
        # SEC-005: Add secure=True (Adaptive) to refresh cookies
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=IS_PROD, samesite="lax", max_age=3600, path="/")
        response.set_cookie(key="refresh_token", value=token, httponly=True, secure=IS_PROD, samesite="lax", max_age=7*24*60*60, path="/")
        
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@app.post("/api/auth/logout")
def logout(request: Request, response: Response, current_user: str = Depends(get_current_user)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        # Blocklist the token in Redis to prevent reuse
        cache.set(f"blocked_token:{refresh_token}", "revoked", ttl=7*24*3600)
    
    # Securely clear cookies
    response.delete_cookie(key="access_token", path="/", httponly=True, secure=IS_PROD, samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", httponly=True, secure=IS_PROD, samesite="lax")
    return {"message": "Logged out securely"}

# --- User Profile ---
class ThemeUpdate(BaseModel):
    username: str
    theme_url: str

def verify_owner(current_user: str, target_user: str):
    if current_user != target_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: You do not own this data sector."
        )


@app.get("/api/user/theme")
def get_theme(username: str, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    theme = db.get_user_theme(username)
    return {"theme_url": theme}

@app.get("/api/profile/{username}")
def get_profile(username: str):
    profile = db.get_public_profile(username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.post("/api/user/theme")
def update_theme(data: ThemeUpdate, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    db.set_user_theme(data.username, data.theme_url)
    return {"message": "Theme updated"}

# --- Anime APIs ---
@app.get("/api/anime/discover")
def discover_anime(
    mode: str = "search", 
    query: Optional[str] = None, 
    genre: Optional[str] = None, 
    page: int = 1, 
    perPage: Optional[int] = None,
    per_page: Optional[int] = None
):
    # Standardize pagination parameters
    final_per_page = perPage or per_page or 50
    # Map 'top' mode (from Trending tab) to the correct AniList mode
    effective_mode = "top" if mode == "top" or mode == "trending" else mode
    
    genres = [genre] if genre else None
    data, page_info = al.fetch_anilist(query=query, mode=effective_mode, genres=genres, page=page, perPage=final_per_page)
    return {"data": data, "pageInfo": page_info}

from utils.schedule_utils import ScheduleFetchError

@app.get("/api/anime/schedule")
def get_schedule(day: str, timezone: str = "UTC"):
    try:
        data = al.fetch_airing_schedule(day, timezone)
        return JSONResponse(status_code=200, content={
            "data": data,
            "meta": {
                "day": day,
                "timezone": timezone,
                "source": data[0]["source"] if data else "unknown",
                "cached": True
            }
        })
    except ScheduleFetchError as e:
        return JSONResponse(status_code=503, content={"error": "schedule_unavailable", "message": str(e)})
    except ValueError as e:
        return JSONResponse(status_code=422, content={"error": "invalid_params", "message": str(e)})

@app.get("/api/anime/recommendations")
def get_recommendations(username: str, genre: Optional[str] = None, page: int = 1, perPage: int = 50, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    if genre == "": genre = None
    items = db.get_user_anime(username, "All")
    
    if not items:
        data, page_info = al.fetch_anilist(mode="top", perPage=perPage, page=page, genres=[genre] if genre else None)
        return {"data": data, "pageInfo": page_info}

    # Signal Maps
    status_weights = {"Completed": 3, "Watching": 2, "Plan to Watch": 1, "Dropped": -1}
    genre_weights = {}
    user_anime_ids = set() # Stores both AniList and MAL IDs

    for item in items:
        anime_id, status, score, genres_str = item[1], item[4], item[5], item[7]
        user_anime_ids.add(anime_id)
        if item[13]: user_anime_ids.add(item[13]) # idMal
        
        # Calculate weights
        multiplier = (score / 5.0) if score > 0 else 1.0
        base_w = status_weights.get(status, 1)
        if status == "Dropped" and (item[12] if len(item) > 12 else None): base_w = -3
        final_w = base_w * multiplier

        # Genres
        if genres_str:
            for g in [x.strip() for x in genres_str.split(',') if x.strip()]:
                genre_weights[g] = genre_weights.get(g, 0) + final_w
        
        # NOTE: For deep tags and studios, we'd ideally have them in the DB.
        # Since they aren't, we rely on the genre signal mostly, but we'll 
        # apply a studio boost for very highly rated shows if we can fetch them.
        # For now, we'll focus on the Sequel Awareness and improved candidate scoring.

    # ENDLESS_HORIZON Protocol: If we need more than the first 150 candidates,
    # we switch to a stream-based discovery while still filtering for collection duplicates.
    is_beyond_pool = (page * perPage) > 150
    
    if is_beyond_pool:
        # Fetch fresh data for this specific page
        stream_candidates, stream_page_info = al.fetch_anilist(mode="top", perPage=perPage, page=page, genres=[genre] if genre else None)
        # Still apply basic collection filter
        filtered_stream = [a for a in stream_candidates if a['mal_id'] not in user_anime_ids and (not a['idMal'] or a['idMal'] not in user_anime_ids)]
        return {
            "data": filtered_stream,
            "pageInfo": {
                "total": stream_page_info.get('total', 1000),
                "lastPage": stream_page_info.get('lastPage', 50),
                "hasNextPage": stream_page_info.get('hasNextPage', True)
            }
        }

    # Fetch 150 candidates with relations/tags/studios for the deep-scoring pool
    candidates, _ = al.fetch_anilist(mode="top", perPage=150, genres=[genre] if genre else None)
    
    scored_candidates = []
    for anime in candidates:
        if genre and genre not in [g['name'] for g in anime.get('genres', [])]:
            continue
        if anime['mal_id'] in user_anime_ids or (anime['idMal'] and anime['idMal'] in user_anime_ids):
            continue
            
        # 1. Sequel Awareness
        is_sequel_missing_prequel = False
        for rel in anime.get('relations', []):
            if rel['relationType'] == 'PREQUEL':
                pre_id = rel['node']['id']
                pre_id_mal = rel['node']['idMal']
                if pre_id not in user_anime_ids and (not pre_id_mal or pre_id_mal not in user_anime_ids):
                    is_sequel_missing_prequel = True
                    break
        
        if is_sequel_missing_prequel: continue

        # 2. Content Scoring
        score = 0
        for g in anime.get('genres', []):
            score += genre_weights.get(g['name'], 0)
        for tag in anime.get('tags', []):
            score += (genre_weights.get(tag, 0) * 0.5)
        
        score += (anime.get('score', 0) / 10.0)
        anime['_match_score'] = score
        scored_candidates.append(anime)

    # Recalculate local pagination for the pool
    scored_candidates.sort(key=lambda x: x.get('_match_score', 0), reverse=True)
    start = (page - 1) * perPage
    end = start + perPage
    
    return {
        "data": scored_candidates[start:end],
        "pageInfo": { 
            "total": 1000, # Large number to keep pagination active
            "lastPage": 50,
            "hasNextPage": True 
        }
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

# SEC-002: Protected in turn 10
@app.get("/api/collection")
def get_collection(username: str, status_filter: str = "All", current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
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

@app.post("/api/collection")
def save_collection(data: AnimeSave, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    high_res_url = upscale_image_url(data.image_url)
    db.save_anime_to_db(data.username, data.anime_id, data.title, high_res_url, 
                        data.status, data.score, data.episodes, data.genres,
                        data.coop_friend_username, data.drop_reason, data.idMal)
    
    return {"message": "Saved to collection"}

class ProgressUpdate(BaseModel):
    username: str
    anime_id: int
    seasons_json: Optional[str] = None
    episode_progress: int = 0

@app.post("/api/collection/progress")
def update_progress(data: ProgressUpdate, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    # 1. Update seasons_json (legacy compatibility)
    db.update_seasons_json(data.username, data.anime_id, data.seasons_json)
    
    # 2. Update the primary progress column and handle status transitions
    with db.engine.begin() as conn:
        anime = conn.execute(
            text("SELECT id, episodes, title_romaji FROM anime WHERE anilist_id = :aid OR mal_id = :aid"),
            {"aid": data.anime_id}
        ).first()
        
        if not anime:
            raise HTTPException(status_code=404, detail="Anime metadata not found")

        # Update the user list entry
        conn.execute(
            text("""
                UPDATE user_anime_list 
                SET episodes_watched = :p, 
                    status = CASE WHEN :p >= :e THEN 'Completed' ELSE status END
                WHERE LOWER(user_id) = LOWER(:u) AND anime_id = :aid
            """),
            {"p": data.episode_progress, "e": anime.episodes or 9999, "u": data.username, "aid": anime.id}
        )

        # Log to watch_history
        conn.execute(
            text("INSERT INTO watch_history (username, anime_id, episode_num) VALUES (:u, :aid, :e)"),
            {"u": data.username, "aid": anime.id, "e": data.episode_progress}
        )
            
    return {"message": "Progress synchronized"}


class ReviewUpdate(BaseModel):
    username: str
    anime_id: int
    review: str

import html

@app.post("/api/collection/review")
def update_review(data: ReviewUpdate, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    safe_review = html.escape(data.review) if data.review else ""
    db.update_review(data.username, data.anime_id, safe_review)
    return {"message": "Review updated"}

class ScoreUpdate(BaseModel):
    username: str
    anime_id: int
    score: float

@app.post("/api/collection/score")
def update_score(data: ScoreUpdate, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    with db.get_db() as conn:
        anime = conn.execute(
            text("SELECT id FROM anime WHERE anilist_id = :aid OR mal_id = :aid"),
            {"aid": data.anime_id}
        ).first()
        if not anime:
            raise HTTPException(status_code=404, detail="Anime not found in master records.")
        anime_uuid = anime[0]
        
        conn.execute(
            text("""
                UPDATE user_anime_list 
                SET score = :score 
                WHERE LOWER(user_id) = LOWER(:uid) AND anime_id = :aid
            """),
            {"score": data.score, "uid": data.username, "aid": anime_uuid}
        )
        conn.commit()
    return {"message": "Score updated"}

@app.delete("/api/collection")
def delete_collection(username: str, anime_id: int, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    db.delete_anime_from_db(username, anime_id)
    return {"message": "Deleted from collection"}

class SeriesNameUpdate(BaseModel):
    username: str
    anime_id: int
    series_name: Optional[str] = None

@app.post("/api/collection/series")
def update_series_name(data: SeriesNameUpdate, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    db.set_series_name(data.username, data.anime_id, data.series_name)
    return {"message": "Series name updated"}

# --- Advanced Features APIs ---
import requests
import random
from datetime import datetime, timedelta

@app.get("/api/user/stats/{username}")
def get_user_stats(username: str, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    # Total episodes from current progress (More accurate for live syncing)
    with db.get_db() as conn:
        total_episodes = conn.execute(
            text('SELECT SUM(episodes_watched) FROM user_anime_list WHERE LOWER(user_id) = LOWER(:u)'), 
            {'u': username}
        ).scalar() or 0

        
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

@app.delete("/api/collection/purge")
def purge_all_data(username: str, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    db.purge_user_data(username)
    return {"message": "PURGE_COMPLETE // ALL DATA WIPED"}

@app.get("/api/collection/backlog")
def get_backlog(username: str, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    items = db.get_user_anime(username, "Plan to Watch")
    total_eps = sum((item[6] or 12) for item in items)
    
    # BUG-002: Improved backlog estimation using 30-day window
    with db.engine.connect() as conn:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_count = conn.execute(
            text('SELECT count(*) FROM watch_history WHERE username = :u AND timestamp > :cutoff'), 
            {'u': username, 'cutoff': thirty_days_ago}
        ).scalar() or 0
        
    eps_per_week = max((recent_count / 4.2), 5.0) # 4.2 weeks in a month
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
def export_collection(username: str, current_user: str = Depends(get_current_user)):
    # SEC-002: Verify ownership before allowing export (IDOR Protection)
    verify_owner(current_user, username)
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
    with db.get_db() as session:
        engine = MetadataEngine(session)
        return engine.resolve_anime_details(media_id)


# --- Backlog & Preferences ---
class StatusUpdate(BaseModel):
    status: str

class PreferencesUpdate(BaseModel):
    watch_rate_per_day: Optional[int] = None
    theme: Optional[str] = None

@app.get("/api/anime/list")
def get_anime_list(status: str, username: str = Depends(get_current_user)):
    status_map = {
        "PLAN_TO_WATCH": "Plan to Watch",
        "WATCHING": "Watching",
        "COMPLETED": "Completed",
        "DROPPED": "Dropped",
        "PAUSED": "On Hold"
    }
    db_status = status_map.get(status, status)
    
    with db.get_db() as session:
        results = session.query(db.UserAnimeList, db.Anime)\
            .join(db.Anime, db.UserAnimeList.anime_id == db.Anime.id)\
            .filter(func.lower(db.UserAnimeList.user_id) == func.lower(username))\
            .filter(db.UserAnimeList.status == db_status)\
            .all()
            
        return [
            {
                "id": a.anilist_id or a.mal_id,
                "mal_id": a.mal_id,
                "title": a.title_romaji,
                "episodes": a.episodes or 0,
                "watched_episodes": ul.episodes_watched or 0,
                "format": a.format or "TV",
                "genres": [g.get('name') for g in a.genres] if a.genres and isinstance(a.genres, list) else [],
                "cover_image": a.image_url,
                "score": ul.score,
                "rank": a.popularity or 0
            }
            for ul, a in results
        ]

@app.patch("/api/anime/{id}/status")
def update_status(id: int, data: StatusUpdate, username: str = Depends(get_current_user)):
    status_map = {
        "PLAN_TO_WATCH": "Plan to Watch",
        "WATCHING": "Watching",
        "COMPLETED": "Completed",
        "DROPPED": "Dropped",
        "PAUSED": "On Hold"
    }
    db_status = status_map.get(data.status, data.status)
    
    with db.get_db() as session:
        anime_uuid = db.resolve_anime_uuid(session, id)
        if not anime_uuid:
            raise HTTPException(status_code=404, detail="Anime not found")
            
        ul_entry = session.query(db.UserAnimeList).filter(
            func.lower(db.UserAnimeList.user_id) == func.lower(username),
            db.UserAnimeList.anime_id == anime_uuid
        ).first()
        
        if not ul_entry:
            # If not in collection, we could add it, but for now we expect it to be there
            raise HTTPException(status_code=404, detail="Anime not in collection")
            
        ul_entry.status = db_status
        session.commit()
        
        # Sentry log
        sentry_sdk.capture_message("backlog.status_updated", level="info",
            extras={"anime_id": id, "new_status": data.status, "user_id": username})
            
        # Return the updated entry (refetching to get full anime data)
        updated = session.query(db.UserAnimeList, db.Anime)\
            .join(db.Anime, db.UserAnimeList.anime_id == db.Anime.id)\
            .filter(db.UserAnimeList.id == ul_entry.id).first()
            
        ul, a = updated
        return {
            "id": a.anilist_id or a.mal_id,
            "mal_id": a.mal_id,
            "title": a.title_romaji,
            "episodes": a.episodes or 0,
            "watched_episodes": ul.episodes_watched or 0,
            "format": a.format or "TV",
            "genres": [g.get('name') for g in a.genres] if a.genres and isinstance(a.genres, list) else [],
            "cover_image": a.image_url,
            "score": ul.score,
            "rank": a.popularity or 0
        }

@app.get("/api/user/preferences")
def get_preferences(username: str = Depends(get_current_user)):
    with db.get_db() as session:
        user = session.query(db.User).filter(func.lower(db.User.username) == func.lower(username)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "watch_rate_per_day": user.watch_rate_per_day or 3,
            "theme": user.custom_theme_selection or "NEURAL_DARK"
        }

@app.patch("/api/user/preferences")
def update_preferences(data: PreferencesUpdate, username: str = Depends(get_current_user)):
    with db.get_db() as session:
        update_data = {}
        if data.watch_rate_per_day is not None:
            update_data["watch_rate_per_day"] = data.watch_rate_per_day
        if data.theme is not None:
            update_data["custom_theme_selection"] = data.theme
            
        if update_data:
            session.query(db.User).filter(func.lower(db.User.username) == func.lower(username)).update(update_data)
            session.commit()
        return {"ok": True}

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
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return {"synopsis": "Error connecting to community API."}

# ── Seasonal Charts ────────────────────────────────────────────────────────────
@app.get("/api/anime/seasonal")
def get_seasonal(year: int, season: str, page: int = 1):
    try:
        result = al.fetch_seasonal_intel(year, season, page)
        return JSONResponse(status_code=200, content=result)
    except ScheduleFetchError as e:
        return JSONResponse(status_code=503, content={"error": "schedule_unavailable", "message": str(e)})

@app.get("/api/anime/top")
def get_top_anime(page: int = 1, per_page: int = 50, genre: Optional[str] = None, year: Optional[int] = None):
    data, page_info = al.fetch_anilist_top(page, per_page, genre, year)
    return {"data": data, "pageInfo": page_info}

@app.get("/api/anime/relations/smart")
def get_smart_relations(idMal: int):
    return {"data": al.fetch_anilist_relations(idMal)}





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
def update_custom_fields(data: CustomFieldsUpdate, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, data.username)
    import html
    safe_tags = html.escape(data.custom_tags) if data.custom_tags else None
    safe_notes = html.escape(data.private_notes) if data.private_notes else None
    db.update_custom_fields(data.username, data.anime_id, safe_tags,
                            safe_notes, data.score_story, data.score_art, data.score_sound)
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
@app.delete("/api/user/account")
def delete_account(username: str):
    db.delete_user_account(username)
    return {"message": "IDENTITY_TERMINATED"}

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

import time

def fetch_missing_metadata_task(username: str):
    """Background worker to fetch images/genres for imported MAL entries."""
    with db.get_db() as conn:
        # We look for anime records linked to this user that lack an image_url
        missing = conn.execute(
            text("""
                SELECT a.anilist_id, a.mal_id, a.title_romaji, a.id 
                FROM anime a
                JOIN user_anime_list ul ON a.id = ul.anime_id
                WHERE ul.user_id = :uid AND (a.image_url = '' OR a.image_url IS NULL)
            """),
            {"uid": username}
        ).fetchall()
        
    if not missing:
        return

    print(f"[Metadata Task] Syncing {len(missing)} titles for {username}...")
    for aid, mid, title, anime_uuid in missing:
        try:
            # Try to fetch exact match from AniList using MAL ID
            best_match = al.fetch_anilist_media(mid, is_mal=True)
            
            img_url = None
            genres_json = "[]"
            anilist_id = None
            
            if best_match:
                img_url = best_match['images']['jpg']['image_url']
                genres_json = json.dumps(best_match['genres'])
                anilist_id = best_match.get('idAniList')
            else:
                # Fallback to Jikan (MAL API) if AniList doesn't have this ID mapped
                try:
                    import requests
                    r = requests.get(f"https://api.jikan.moe/v4/anime/{mid}", timeout=10)
                    if r.status_code == 200:
                        j_data = r.json().get('data', {})
                        img_url = j_data.get('images', {}).get('jpg', {}).get('large_image_url')
                        genres_json = json.dumps([{"name": g.get("name")} for g in j_data.get('genres', [])])
                except Exception as je:
                    print(f"Jikan fallback failed for {title}: {je}")
            
            # If both fail, mark as 'not_found' to prevent infinite retries
            if not img_url:
                img_url = "not_found"
                
            # Update Anime DB (Master record)
            with db.get_db() as session:
                session.execute(
                    text("""
                        UPDATE anime 
                        SET image_url = :img, genres = CAST(:genres AS JSON), anilist_id = COALESCE(:anilist_id, anilist_id)
                        WHERE id = :id
                    """),
                    {
                        "img": img_url,
                        "genres": genres_json,
                        "anilist_id": anilist_id,
                        "id": anime_uuid
                    }
                )
                session.commit()
            
            # Sleep adequately to prevent 429 Too Many Requests
            time.sleep(2.0) 
        except Exception as e:
            print(f"Failed to sync metadata for {title}: {e}")

@app.post("/api/import/mal")
async def import_mal(username: str, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user), file: UploadFile = File(...)):
    verify_owner(current_user, username)
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
        "On Hold": "On Hold",
        "1": "Watching",
        "2": "Completed",
        "3": "On Hold",
        "4": "Dropped",
        "6": "Plan to Watch"
    }

    import_list = []
    for anime in root.iter('anime'):
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
        
        # Offload the processing to the background
        background_tasks.add_task(fetch_missing_metadata_task, username)
        
        return {
            "message": "Import sequence initiated. Your collection will update shortly.",
            "username": username,
            "inserted": stats['inserted'],
            "updated": stats['updated']
        }

    return {"message": "No anime found to import."}

@app.post("/api/sync/anilist")
async def sync_anilist(username: str, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user)):
    verify_owner(current_user, username)
    """
    Syncs the user's collection with AniList using the app username.
    Assumes AniList username is the same as the app username.
    """
    try:
        # Fetch from AniList
        # Note: We do it synchronously for the first page to give immediate feedback if possible,
        # but for safety let's offload the whole thing.
        background_tasks.add_task(execute_anilist_sync, username)
        return {"message": "SYNC_PROTOCOL_INITIATED // ARCHIVE_UPDATE_IN_PROGRESS"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/import/animeschedule")
async def import_animeschedule(username: str, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user), file: UploadFile = File(...)):
    verify_owner(current_user, username)
    content = await file.read()
    try:
        import json
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="INVALID_JSON_STREAM // CORRUPTED_FILE")

    try:
        # Check for AnimeSchedule GDPR Export Format
        if isinstance(data, dict):
            if "animelist" in data and "shows" in data["animelist"]:
                shows_dict = data["animelist"]["shows"]
                new_data = []
                for route, show_data in shows_dict.items():
                    # Format 'shingeki-no-kyojin' -> 'Shingeki No Kyojin'
                    show_data["title"] = route.replace("-", " ").title()
                    # Generate a reliable pseudo-ID for Postgres conflict checking
                    import hashlib
                    pseudo_id = int(hashlib.md5(route.encode()).hexdigest(), 16) % (10**8)
                    show_data["idMal"] = pseudo_id
                    new_data.append(show_data)
                data = new_data
            elif "entries" in data: data = data["entries"]
            elif "anime" in data: data = data["anime"]
            elif "items" in data: data = data["items"]
            else:
                for v in data.values():
                    if isinstance(v, list):
                        data = v
                        break
        
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="UNSUPPORTED_JSON_STRUCTURE")

        # Map AnimeSchedule statuses to RoninHub internal schema
        STATUS_MAP = {
            "watching": "Watching",
            "current": "Watching",
            "completed": "Completed",
            "planned": "Plan to Watch",
            "planning": "Plan to Watch",
            "dropped": "Dropped",
            "on_hold": "On Hold",
            "on hold": "On Hold",
            "paused": "On Hold",
            "to-watch": "Plan to Watch",
            "to_watch": "Plan to Watch",
            "plan_to_watch": "Plan to Watch"
        }

        import_list = []
        for item in data:
            if not isinstance(item, dict): continue
            
            # Handle AniList-style nested media object or flat structure
            media = item.get('media', {})
            mal_id = item.get('mal_id') or item.get('idMal') or item.get('id') or media.get('idMal') or media.get('id')
            if not mal_id: continue 
            
            title = item.get('title') or media.get('title', {}).get('romaji') or media.get('title', {}).get('english') or 'Unknown Title'
            status_raw = str(item.get('status') or item.get('listStatus') or item.get('my_status', 'planned')).lower()
            
            import_list.append({
                "anime_id": mal_id,
                "title": title,
                "image_url": item.get('image_url') or media.get('coverImage', {}).get('extraLarge') or "", 
                "status": STATUS_MAP.get(status_raw, 'Plan to Watch'),
                "score": float(item.get('score') or item.get('manualScore') or item.get('averageScore') or 0),
                "episodes": int(item.get('episodes') or media.get('episodes') or 0),
                "progress": int(item.get('episodes_watched') or item.get('episodesSeen') or item.get('progress') or 0),
                "idMal": mal_id
            })

        if import_list:
            stats = db.batch_import_anime(username, import_list)
            background_tasks.add_task(fetch_missing_metadata_task, username)
            return {
                "message": "IMPORT_SUCCESS // METADATA_SYNC_QUEUED",
                "inserted": stats['inserted'],
                "updated": stats['updated']
            }

        return {"message": "NO_COMPATIBLE_ENTRIES_FOUND"}
    except Exception as e:
        print(f"[Import Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"INTERNAL_PARSER_ERROR: {str(e)}")

def execute_anilist_sync(username: str):
    """Actual worker logic for AniList sync."""
    print(f"[Sync] Starting AniList sync for {username}...")
    import anilist as al
    import database as db
    
    data_list = al.fetch_anilist_user_list(username)
    if data_list:
        db.batch_import_anime(username, data_list)
        # Fetch metadata for any missing ones
        fetch_missing_metadata_task(username)
        print(f"[Sync] AniList sync complete for {username}")
    else:
        print(f"[Sync] No data found or error for {username}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
