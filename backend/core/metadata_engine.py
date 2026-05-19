import uuid
from datetime import datetime, timedelta
import requests
import sentry_sdk
from sqlalchemy.orm import Session
from fastapi import HTTPException

from database import ProviderCache, Anime
from anilist import fetch_anilist_media
from utils.fallback_logger import log_fallback_event  # Phase 1

class MetadataEngine:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_cached_provider_data(self, provider: str, external_id: str):
        cache_entry = self.db.query(ProviderCache).filter(
            ProviderCache.provider == provider,
            ProviderCache.external_id == str(external_id)
        ).first()

        if cache_entry:
            # Check TTL
            if datetime.utcnow() < cache_entry.fetched_at + timedelta(seconds=cache_entry.ttl_seconds):
                return cache_entry.payload
            else:
                # Delete expired cache
                self.db.delete(cache_entry)
                self.db.flush()
        return None

    def set_cached_provider_data(self, provider: str, external_id: str, payload: dict, ttl_seconds: int = 3600):
        new_cache = ProviderCache(
            id=uuid.uuid4(),
            provider=provider,
            external_id=str(external_id),
            payload=payload,
            ttl_seconds=ttl_seconds
        )
        self.db.add(new_cache)
        self.db.flush()

    def fetch_jikan_media(self, media_id: int):
        try:
            r = requests.get(f"https://api.jikan.moe/v4/anime/{media_id}/full", timeout=8)
            if r.status_code == 404:
                raise HTTPException(status_code=404, detail="Anime not found in Jikan.")
            r.raise_for_status()
            
            data = r.json().get('data')
            if data:
                data['external_links'] = [{"site": ex['name'], "url": ex['url'], "type": "Official"} for ex in data.get('external', [])]
                return {"data": data, "source": "jikan"}
            return None
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Anime not found in Jikan.")
            raise e

    def resolve_anime_details(self, media_id: int):
        print(f"!!! [METADATA_ENGINE] Resolving ID: {media_id} !!!")
        # Check AniList cache
        anilist_cache = self.get_cached_provider_data("anilist", str(media_id))
        if anilist_cache:
            print(f"!!! [METADATA_ENGINE] Found AniList Cache for {media_id}: {anilist_cache.get('data', {}).get('title')} !!!")
            return anilist_cache

        # Check Jikan cache
        jikan_cache = self.get_cached_provider_data("jikan", str(media_id))
        if jikan_cache:
            print(f"!!! [METADATA_ENGINE] Found Jikan Cache for {media_id}: {jikan_cache.get('data', {}).get('title')} !!!")
            return jikan_cache

        # Provider 1: AniList
        try:
            # 1. NEW: Check local canonical records first to avoid ID collisions
            local_record = self.db.query(Anime).filter(
                (Anime.anilist_id == media_id) | (Anime.mal_id == media_id)
            ).first()
            
            al_data = None
            if local_record:
                print(f"!!! [METADATA_ENGINE] Local Record Found: {local_record.title_romaji} (AniList: {local_record.anilist_id}, MAL: {local_record.mal_id}) !!!")
                # We know for sure if this is AniList or MAL
                if local_record.anilist_id == media_id:
                    print(f"!!! [METADATA_ENGINE] ID {media_id} is a confirmed AniList ID. Fetching... !!!")
                    al_data = fetch_anilist_media(media_id, is_mal=False)
                else:
                    print(f"!!! [METADATA_ENGINE] ID {media_id} is a confirmed MAL ID. Fetching... !!!")
                    al_data = fetch_anilist_media(media_id, is_mal=True)
            else:
                print(f"!!! [METADATA_ENGINE] No local record for {media_id}. Trying AniList (MAL fallback)... !!!")
                al_data = fetch_anilist_media(media_id, is_mal=True)
                if not al_data:
                    al_data = fetch_anilist_media(media_id, is_mal=False)

            if al_data:
                result = {"data": al_data, "source": "anilist"}
                self.set_cached_provider_data("anilist", str(media_id), result, ttl_seconds=3600)
                return result
                
        except Exception as e:
            # Phase 1: log AniList→Jikan fallback event
            log_fallback_event(
                "resolve_anime_details",
                str(getattr(getattr(e, 'response', None), 'status_code', None) or type(e).__name__),
            )
            sentry_sdk.capture_message(
                f"Provider Failure: AniList failed for anime {media_id}. Error: {e}",
                level="warning"
            )

        # Provider 2: Jikan (Fallback)
        try:
            j_data = self.fetch_jikan_media(media_id)
            if j_data:
                # Phase 4: 30min TTL for Jikan cover/metadata fallback (stable data)
                self.set_cached_provider_data("jikan", str(media_id), j_data, ttl_seconds=1800)
                return j_data
        except HTTPException as he:
            # Re-raise 404 immediately
            raise he
        except Exception as e:
            sentry_sdk.capture_message(
                f"Provider Failure: Jikan failed for anime {media_id}. Error: {e}",
                level="warning"
            )
            
        raise HTTPException(status_code=404, detail="Anime not found in any uplink (All uplinks disabled or ID invalid).")
