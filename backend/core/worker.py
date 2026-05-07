import os
import asyncio
import sentry_sdk
from arq.connections import RedisSettings

# Initialize Sentry for worker process
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN)

async def sync_external_library(ctx, username: str, provider: str):
    """
    Background task to sync with external providers (AniList/MAL).
    Offloads high-latency API calls from the main event loop.
    """
    print(f"[WORKER] Starting sync for {username} via {provider}...")
    try:
        # Implementation of external sync logic
        # For now, a mock delay representing API overhead
        await asyncio.sleep(2)
        print(f"[WORKER] Sync completed for {username}")
        return {"status": "success", "username": username}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return {"status": "error", "message": str(e)}

async def dispatch_notification(ctx, username: str, message: str, anime_id: int):
    """
    Background task for notification distribution.
    Ensures that real-time alerts don't block user interactions.
    """
    from database import create_notification
    try:
        create_notification(username, message, anime_id)
        print(f"[WORKER] Notification dispatched to {username}: {message}")
        return True
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return False

async def startup(ctx):
    print("[WORKER] Initializing Distribution Engine...")

async def shutdown(ctx):
    print("[WORKER] Shutting down Distribution Engine...")

import json
from datetime import datetime
from zoneinfo import ZoneInfo
from arq.cron import cron

async def check_upcoming_episodes(ctx):
    print("[WORKER] Checking for upcoming episodes...")
    from database import get_db, User, UserAnimeList, Anime
    from anilist import fetch_airing_schedule
    
    redis_client = ctx['redis']
    
    with get_db() as session:
        users = session.query(User).all()
        for user in users:
            tracked = session.query(UserAnimeList).filter(UserAnimeList.user_id == user.username).count()
            if tracked == 0: continue
            
            user_tz = "UTC"
            try:
                day_name = datetime.now(ZoneInfo(user_tz)).strftime("%A").lower()
                schedule = fetch_airing_schedule(day_name, user_tz)
            except Exception as e:
                print(f"[WORKER] Failed to fetch schedule for {user.username}: {e}")
                continue
                
            now_unix = int(datetime.now(ZoneInfo("UTC")).timestamp())
            
            for ep in schedule:
                # 15 minutes window
                if 0 <= ep['airing_at'] - now_unix <= 900:
                    is_tracking = session.query(UserAnimeList).join(Anime, UserAnimeList.anime_id == Anime.id).filter(
                        UserAnimeList.user_id == user.username,
                        ((Anime.anilist_id == ep['id']) | (Anime.mal_id == ep['id_mal']))
                    ).first()
                    
                    if is_tracking:
                        dedup_key = f"alert_sent:{user.username}:{ep['id']}:{ep['episode']}"
                        if not await redis_client.get(dedup_key):
                            print(f"[WORKER] Alerting {user.username} for {ep['title_romaji']} Ep {ep['episode']}")
                            channel = f"sse:alerts:{user.username}"
                            event_data = {
                                "anime_id": ep['id'],
                                "title": ep['title_romaji'],
                                "episode": ep['episode'],
                                "airing_at": ep['airing_at'],
                                "cover_image": ep['cover_image']
                            }
                            await redis_client.publish(channel, json.dumps({"event": "airing_alert", "data": event_data}))
                            await redis_client.setex(dedup_key, 3600, "1")

async def refresh_seasonal_cache(ctx):
    print("[WORKER] Refreshing seasonal cache...")
    redis_client = ctx['redis']
    now = datetime.now(ZoneInfo("UTC"))
    month = now.month
    if month in [12, 1, 2]: season = "WINTER"
    elif month in [3, 4, 5]: season = "SPRING"
    elif month in [6, 7, 8]: season = "SUMMER"
    else: season = "FALL"
    
    year = now.year if month != 12 or season != "WINTER" else now.year + 1
    
    try:
        from anilist import fetch_seasonal_intel
        res = fetch_seasonal_intel(year, season, 1)
        count = len(res.get("data", []))
        
        channel = f"sse:seasonal:{season}:{year}"
        event_data = {
            "season": season,
            "year": year,
            "count": count
        }
        await redis_client.publish(channel, json.dumps({"event": "seasonal_preview", "data": event_data}))
        print(f"[WORKER] Warmed seasonal cache for {season} {year}")
    except Exception as e:
        print(f"[WORKER] Failed to warm seasonal cache: {e}")

class WorkerSettings:
    """
    ARQ Worker configuration.
    To run: `arq core.worker.WorkerSettings`
    """
    functions = [sync_external_library, dispatch_notification]
    cron_jobs = [
        cron(check_upcoming_episodes, minute=set(range(60))),
        cron(refresh_seasonal_cache, hour=set([0, 6, 12, 18]), minute=0)
    ]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"))
    on_startup = startup
    on_shutdown = shutdown
    # Additional resilience settings
    max_jobs = 10
    job_timeout = 60 # seconds
