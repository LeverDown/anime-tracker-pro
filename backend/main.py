from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import json
import database as db
import anilist as al

app = FastAPI(title="Anime Tracker API")

# Setup CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    db.init_db()

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
def get_recommendations(username: str):
    items = db.get_user_anime(username, "All")
    
    if not items:
        # Fallback if no history
        data, page_info = al.fetch_anilist(mode="top", perPage=24)
        return {"data": data, "pageInfo": page_info}

    # Weight logic: Completed=3, Watching=2, Plan to Watch=1, Dropped=-1
    status_weights = {"Completed": 3, "Watching": 2, "Plan to Watch": 1, "Dropped": -1}
    genre_weights = {}
    user_anime_ids = set()

    for item in items:
        anime_id = item[1]
        status = item[4]
        score = item[5] # 0 to 10 scale, 0 means unrated
        genres_str = item[7]
        user_anime_ids.add(anime_id)
        
        if not genres_str:
            continue
            
        base_weight = status_weights.get(status, 1)
        
        # Adjust weight based on score if available (score > 0)
        # E.g., a score of 10 gives a 2x multiplier, a score of 5 gives 1x, a score of 1 gives 0.2x
        multiplier = 1.0
        if score > 0:
            multiplier = score / 5.0

        final_weight = base_weight * multiplier

        genres = [g.strip() for g in genres_str.split(',') if g.strip()]
        for g in genres:
            genre_weights[g] = genre_weights.get(g, 0) + final_weight

    # Fetch top 50 trending/popular anime as candidates
    candidates, _ = al.fetch_anilist(mode="top", perPage=50)
    
    # Score candidates
    scored_candidates = []
    for anime in candidates:
        if anime['mal_id'] in user_anime_ids:
            continue
            
        match_score = 0
        for genre_obj in anime.get('genres', []):
            g_name = genre_obj['name']
            match_score += genre_weights.get(g_name, 0)
            
        # Boost slightly by general popularity/average score to avoid highly specific but garbage anime
        match_score += (anime.get('score', 0) / 10.0)

        anime['_match_score'] = match_score
        scored_candidates.append(anime)
        
    # Sort by match score descending
    scored_candidates.sort(key=lambda x: x['_match_score'], reverse=True)
    
    # Only return top 24
    return {"data": scored_candidates[:24]}

# --- Collection ---
class AnimeSave(BaseModel):
    username: str
    anime_id: int
    title: str
    image_url: str
    status: str
    score: float
    episodes: int
    genres: str

@app.get("/api/collection")
def get_collection(username: str, status_filter: str = "All"):
    items = db.get_user_anime(username, status_filter)
    # Map tuple to dict for easy JSON parsing
    result = []
    for item in items:
        result.append({
            "username": item[0], "anime_id": item[1], "title": item[2], "image_url": item[3],
            "status": item[4], "score": item[5], "episodes": item[6], "genres": item[7],
            "review": item[8], "progress": item[9], "seasons_json": item[10]
        })
    return {"data": result}

@app.post("/api/collection")
def save_collection(data: AnimeSave):
    db.save_anime_to_db(data.username, data.anime_id, data.title, data.image_url, 
                        data.status, data.score, data.episodes, data.genres)
    return {"message": "Saved to collection"}

class ProgressUpdate(BaseModel):
    username: str
    anime_id: int
    seasons_json: str

@app.post("/api/collection/progress")
def update_progress(data: ProgressUpdate):
    db.update_seasons_json(data.username, data.anime_id, data.seasons_json)
    return {"message": "Progress updated"}

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
