import os
import json
import uuid
import sentry_sdk
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from typing import Any, Optional
from contextlib import contextmanager

# DEPRECATED [Phase 1]: SHA-256 auth removed. See backend/core/security.py.
from core.security import hash_password, verify_password

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("CRITICAL_FAILURE // DATABASE_URL NOT SET")


# Use pool_pre_ping to handle disconnected connections
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Canonical Models
class User(Base):
    __tablename__ = "users"
    username = Column(String, primary_key=True)
    password = Column(String)
    email = Column(String)
    theme_url = Column(Text)
    banner_url = Column(Text)
    pfp_url = Column(Text)
    theme_color = Column(String, default='#ff0055')
    atmosphere_url = Column(Text)
    seasonal_theme_enabled = Column(Integer, default=0)
    custom_theme_selection = Column(String, default='Personal')
    watch_rate_per_day = Column(Integer, default=3)

# --- CANONICAL SCHEMA MODELS ---
class Anime(Base):
    __tablename__ = "anime"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mal_id = Column(Integer, unique=True, nullable=True)
    anilist_id = Column(Integer, unique=True, nullable=True)
    title_romaji = Column(String)
    title_english = Column(String)
    image_url = Column(String)
    format = Column(String)
    status = Column(String)
    score = Column(Float)
    popularity = Column(Integer)
    synopsis = Column(Text)
    episodes = Column(Integer)
    genres = Column(JSON)
    trailer_url = Column(String)

class UserAnimeList(Base):
    __tablename__ = "user_anime_list"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.username"))
    anime_id = Column(UUID(as_uuid=True), ForeignKey("anime.id"))
    status = Column(String)
    score = Column(Float)
    episodes_watched = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    # Extra fields for RDS compatibility
    review = Column(Text)
    seasons_json = Column(Text)
    coop_friend_username = Column(Text)
    drop_reason = Column(Text)
    custom_tags = Column(Text)
    private_notes = Column(Text)
    score_story = Column(Float)
    score_art = Column(Float)
    score_sound = Column(Float)
    series_name = Column(Text)


class ProviderCache(Base):
    __tablename__ = "provider_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String)
    external_id = Column(String)
    payload = Column(JSON)
    fetched_at = Column(DateTime, server_default=func.now())
    ttl_seconds = Column(Integer, default=3600)

class WatchHistory(Base):
    __tablename__ = "watch_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, ForeignKey("users.username"))
    anime_id = Column(UUID(as_uuid=True), ForeignKey("anime.id"))
    episode_num = Column(Integer)
    timestamp = Column(DateTime, server_default=func.now())

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Ensure all tables are created in the database
    Base.metadata.create_all(bind=engine)

def resolve_anime_uuid(session: Session, external_id: Any) -> Optional[uuid.UUID]:
    """Resolves an AniList or MAL ID to a canonical Anime UUID."""
    anime = session.query(Anime).filter((Anime.anilist_id == external_id) | (Anime.mal_id == external_id)).first()
    return anime.id if anime else None

def add_user(username, password, email):
    with get_db() as session:
        try:
            new_user = User(username=username, password=hash_password(password), email=email)
            session.add(new_user)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            sentry_sdk.capture_exception(e)
            return False

def login_user(username, password):
    with get_db() as session:
        # Allow login by username OR email
        user = session.query(User).filter(
            (func.lower(User.username) == func.lower(username)) | 
            (func.lower(User.email) == func.lower(username))
        ).first()
        
        if user:
            is_valid, needs_rehash = verify_password(password, user.password)
            if not is_valid:
                print(f"!!! [DB_AUTH] Password mismatch for user: {user.username} !!!")
            return is_valid, needs_rehash
            
        print(f"!!! [DB_AUTH] User NOT found for input: {username} !!!")
        return False, False

def get_user_theme(username):
    with get_db() as session:
        user = session.query(User).filter(func.lower(User.username) == func.lower(username)).first()
        return user.theme_url if user else None

def set_user_theme(username, theme_url):
    with get_db() as session:
        session.query(User).filter(User.username == username).update({"theme_url": theme_url})
        session.commit()

def get_seasonal_theme_enabled(username):
    with get_db() as session:
        user = session.query(User).filter(User.username == username).first()
        return bool(user.seasonal_theme_enabled) if user else False

def set_seasonal_theme_enabled(username, enabled):
    with get_db() as session:
        session.query(User).filter(User.username == username).update({"seasonal_theme_enabled": 1 if enabled else 0})
        session.commit()

def get_custom_theme_selection(username):
    with get_db() as session:
        user = session.query(User).filter(User.username == username).first()
        return user.custom_theme_selection if user else 'Personal'

def set_custom_theme_selection(username, selection):
    with get_db() as session:
        session.query(User).filter(User.username == username).update({"custom_theme_selection": selection})
        session.commit()



def save_anime_to_db(username, anime_id, title, image_url, status, score, episodes, genres, coop_friend_username=None, drop_reason=None, idMal=None):
    with get_db() as session:
        # 1. Resolve or Create Anime record
        # Use anilist_id or mal_id to find the anime
        anime = session.query(Anime).filter((Anime.anilist_id == anime_id) | (Anime.mal_id == idMal)).first()
        
        if not anime:
            # Create new anime
            # Note: genres should be handled as JSON list for the new schema
            genres_list = []
            if genres and isinstance(genres, str):
                genres_list = [{"name": g.strip()} for g in genres.split(",") if g.strip()]
            
            anime = Anime(
                id=uuid.uuid4(),
                anilist_id=anime_id,
                mal_id=idMal,
                title_romaji=title,
                title_english=title,
                image_url=image_url,
                episodes=episodes,
                genres=genres_list,
                status="FINISHED"
            )
            session.add(anime)
            session.flush()
        else:
            # Update anime metadata if needed
            anime.title_romaji = title
            anime.image_url = image_url
            anime.episodes = episodes
            if idMal: anime.mal_id = idMal

        # 2. Resolve or Create UserAnimeList record
        existing_ul = session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime.id).first()
        
        current_progress = episodes if status == "Completed" else (existing_ul.episodes_watched if existing_ul else 0)
        review_text = existing_ul.review if existing_ul else ""
        
        if existing_ul:
            existing_ul.status = status
            existing_ul.score = score
            existing_ul.episodes_watched = current_progress
            if coop_friend_username is not None: existing_ul.coop_friend_username = coop_friend_username if coop_friend_username != "" else None
            if drop_reason is not None: existing_ul.drop_reason = drop_reason if drop_reason != "" else None
        else:
            initial_season = [{"id": anime_id, "name": "Season 1 (Main)", "total": episodes if episodes else 0, "watched": current_progress}]
            new_ul = UserAnimeList(
                id=uuid.uuid4(),
                user_id=username,
                anime_id=anime.id,
                status=status,
                score=score,
                episodes_watched=current_progress,
                review=review_text,
                seasons_json=json.dumps(initial_season),
                coop_friend_username=coop_friend_username if coop_friend_username != "" else None,
                drop_reason=drop_reason if drop_reason != "" else None,
                series_name=title
            )
            session.add(new_ul)
            
        session.commit()

def get_user_anime(username, status_filter):
    with get_db() as session:
        query = session.query(UserAnimeList, Anime).join(Anime, UserAnimeList.anime_id == Anime.id).filter(func.lower(UserAnimeList.user_id) == func.lower(username))
        if status_filter != "All":
            query = query.filter(UserAnimeList.status == status_filter)
        results = query.all()
        
        # Mapping back to the legacy tuple format for main.py compatibility
        # (r.username, r.anime_id, r.title, r.image_url, r.status, r.score, r.episodes, r.genres, r.review, r.progress, r.seasons_json, r.coop_friend_username, r.drop_reason, r.idMal, r.custom_tags, r.private_notes, r.score_story, r.score_art, r.score_sound, r.series_name)
        
        output = []
        for ul, a in results:
            # We use anilist_id or mal_id as the "anime_id" index [1] for the frontend
            aid = a.anilist_id or a.mal_id
            
            # genres is a JSON list in DB, legacy expected comma-separated string
            genres_str = ""
            if a.genres and isinstance(a.genres, list):
                genres_str = ", ".join([g.get('name', '') for g in a.genres])
            elif isinstance(a.genres, str):
                genres_str = a.genres

            output.append((
                ul.user_id,             # 0: username
                aid,                    # 1: anime_id
                a.title_romaji,         # 2: title
                a.image_url,            # 3: image_url
                ul.status,              # 4: status
                ul.score,               # 5: score
                a.episodes,             # 6: episodes
                genres_str,             # 7: genres
                ul.review,              # 8: review
                ul.episodes_watched,    # 9: progress
                ul.seasons_json,        # 10: seasons_json
                ul.coop_friend_username, # 11: coop_friend_username
                ul.drop_reason,         # 12: drop_reason
                a.mal_id,               # 13: idMal
                ul.custom_tags,         # 14: custom_tags
                ul.private_notes,       # 15: private_notes
                ul.score_story,         # 16: score_story
                ul.score_art,           # 17: score_art
                ul.score_sound,         # 18: score_sound
                ul.series_name          # 19: series_name
            ))
        return output



def update_seasons_json(username, anime_id, seasons_json):
    with get_db() as session:
        # Resolve UUID from anilist_id/mal_id
        anime = session.query(Anime).filter((Anime.anilist_id == anime_id) | (Anime.mal_id == anime_id)).first()
        if anime:
            session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime.id).update({"seasons_json": seasons_json})
            session.commit()

def log_watch_history(username, anime_id, episode):
    with get_db() as session:
        anime_uuid = resolve_anime_uuid(session, anime_id)
        if anime_uuid:
            new_entry = WatchHistory(username=username, anime_id=anime_uuid, episode_num=episode)
            session.add(new_entry)
            session.commit()



def update_review(username, anime_id, review):
    with get_db() as session:
        anime_uuid = resolve_anime_uuid(session, anime_id)
        if anime_uuid:
            session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime_uuid).update({"review": review})
            session.commit()

def delete_anime_from_db(username, anime_id):
    with get_db() as session:
        anime_uuid = resolve_anime_uuid(session, anime_id)
        if anime_uuid:
            session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime_uuid).delete()
            session.commit()



def purge_user_data(username):
    """Irreversible operation: wipes all collection and history for a user."""
    with get_db() as session:
        # Delete from UserAnimeList
        session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username)).delete(synchronize_session=False)
        # Delete from WatchHistory
        session.query(WatchHistory).filter(func.lower(WatchHistory.username) == func.lower(username)).delete(synchronize_session=False)
        session.commit()



def set_series_name(username, anime_id, series_name):
    with get_db() as session:
        anime_uuid = resolve_anime_uuid(session, anime_id)
        if anime_uuid:
            session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime_uuid).update({"series_name": series_name})
            session.commit()



def update_custom_fields(username, anime_id, custom_tags, private_notes, score_story, score_art, score_sound):
    with get_db() as session:
        anime_uuid = resolve_anime_uuid(session, anime_id)
        if anime_uuid:
            session.query(UserAnimeList).filter(func.lower(UserAnimeList.user_id) == func.lower(username), UserAnimeList.anime_id == anime_uuid).update({
                "custom_tags": custom_tags,
                "private_notes": private_notes,
                "score_story": score_story,
                "score_art": score_art,
                "score_sound": score_sound
            })
            session.commit()

def get_public_profile(username):
    with get_db() as session:
        user = session.query(User).filter(func.lower(User.username) == func.lower(username)).first()
        if not user:
            return None
        
        items = session.query(UserAnimeList, Anime).join(Anime, UserAnimeList.anime_id == Anime.id).filter(func.lower(UserAnimeList.user_id) == func.lower(username)).all()
        total = len(items)
        completed = sum(1 for ul, a in items if ul.status == 'Completed')
        scored = [ul.score for ul, a in items if ul.score and ul.score > 0]
        avg_score = round(sum(scored) / len(scored), 1) if scored else 0
        
        genre_counts = {}
        for ul, a in items:
            if a.genres and isinstance(a.genres, list):
                for g in a.genres:
                    name = g.get('name', '').strip()
                    if name: genre_counts[name] = genre_counts.get(name, 0) + 1
        
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        completed_shows = [{'anime_id': a.anilist_id or a.mal_id, 'title': a.title_romaji, 'image_url': a.image_url, 'score': ul.score} for ul, a in items if ul.status == 'Completed'][:24]
        
        total_episodes = sum(ul.episodes_watched or 0 for ul, a in items)
        days_watched = round((total_episodes * 23) / (60 * 24), 1) # Assuming 23 mins avg
        
        return {
            'username': username,
            'banner_url': user.banner_url,
            'pfp_url': user.pfp_url,
            'theme_color': user.theme_color or '#ff0055',
            'atmosphere_url': user.atmosphere_url,
            'total_titles': total,
            'completed': completed,
            'total_episodes': total_episodes,
            'days_watched': days_watched,
            'avg_score': avg_score,
            'top_genres': [{'name': k, 'count': v} for k, v in top_genres],
            'completed_shows': completed_shows,
        }

def update_user_profile(username, banner_url=None, pfp_url=None, theme_color=None, atmosphere_url=None):
    with get_db() as session:
        update_data = {}
        if banner_url is not None: update_data["banner_url"] = banner_url if banner_url else None
        if pfp_url is not None: update_data["pfp_url"] = pfp_url if pfp_url else None
        if theme_color is not None: update_data["theme_color"] = theme_color if theme_color else '#ff0055'
        if atmosphere_url is not None: update_data["atmosphere_url"] = atmosphere_url if atmosphere_url else None
        
        if update_data:
            session.query(User).filter(User.username == username).update(update_data)
            session.commit()

def batch_import_anime(username, data_list):
    stats = {"inserted": 0, "updated": 0}
    with get_db() as session:
        if not data_list:
            return stats
            
        import uuid
        
        # 1. Bulk Upsert Anime Table
        anime_params = []
        for item in data_list:
            # We assume mal_id is provided by the XML import
            mal_id = item.get('idMal')
            if not mal_id: continue
            
            anime_params.append({
                "id": str(uuid.uuid4()),
                "mal_id": mal_id,
                "title_english": item['title'],
                "title_romaji": item['title'],
                "image_url": item.get('image_url', ''),
                "episodes": item.get('episodes', 0),
                "status": "FINISHED"
            })
            
        if anime_params:
            session.execute(text("""
                INSERT INTO anime (id, mal_id, title_english, title_romaji, image_url, episodes, status)
                VALUES (:id, :mal_id, :title_english, :title_romaji, :image_url, :episodes, :status)
                ON CONFLICT (mal_id) DO UPDATE SET 
                    title_english = COALESCE(anime.title_english, EXCLUDED.title_english),
                    episodes = GREATEST(anime.episodes, EXCLUDED.episodes)
            """), anime_params)
            
        # 2. Bulk Upsert UserAnimeList Table
        # We need to map mal_id to the actual UUID from anime table
        mal_ids = [item['idMal'] for item in data_list if item.get('idMal')]
        if mal_ids:
            anime_records = session.execute(text(
                "SELECT id, mal_id FROM anime WHERE mal_id = ANY(:mal_ids)"
            ), {"mal_ids": mal_ids}).fetchall()
            
            mal_to_uuid = {str(r[1]): str(r[0]) for r in anime_records}
            
            list_params = []
            for item in data_list:
                mal_id = str(item.get('idMal'))
                if mal_id not in mal_to_uuid: continue
                
                list_params.append({
                    "id": str(uuid.uuid4()),
                    "user_id": username,
                    "anime_id": mal_to_uuid[mal_id],
                    "status": item['status'],
                    "score": item['score'],
                    "episodes_watched": item['progress']
                })
                
            if list_params:
                # Use ON CONFLICT if we had a unique constraint on (user_id, anime_id).
                # Since we don't have it defined in Alembic explicitly, we can't reliably ON CONFLICT.
                # Let's delete existing links and bulk insert.
                anime_ids = [p['anime_id'] for p in list_params]
                session.execute(text("""
                    DELETE FROM user_anime_list WHERE user_id = :user_id AND anime_id = ANY(CAST(:anime_ids AS uuid[]))
                """), {"user_id": username, "anime_ids": anime_ids})
                
                session.execute(text("""
                    INSERT INTO user_anime_list (id, user_id, anime_id, status, score, episodes_watched)
                    VALUES (:id, :user_id, :anime_id, :status, :score, :episodes_watched)
                """), list_params)
                
                stats["inserted"] = len(list_params)
                
        session.commit()
    return stats

def delete_user_account(username):
    """Total deletion of user identity and all associated data."""
    with get_db() as session:
        # 1. Wipe Collection & History (reuse purge logic)
        purge_user_data(username)
        
        # 2. Delete the User record itself
        session.query(User).filter(func.lower(User.username) == func.lower(username)).delete(synchronize_session=False)
        
        session.commit()
