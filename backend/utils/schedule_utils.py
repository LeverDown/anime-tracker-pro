import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

class AniListFetchError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code

class JikanFetchError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code

class ScheduleFetchError(Exception):
    def __init__(self, message):
        super().__init__(message)

def get_utc_window(day_name: str, user_timezone: str) -> tuple[int, int]:
    valid_days = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    day_lower = day_name.lower()
    if day_lower not in valid_days:
        raise ValueError(f"Invalid day_name: {day_name}")
    
    try:
        tz = ZoneInfo(user_timezone)
    except Exception:
        raise ValueError(f"Invalid timezone: {user_timezone}")

    now = datetime.now(tz)
    target_weekday = valid_days[day_lower]
    current_weekday = now.weekday()
    
    days_ahead = (target_weekday - current_weekday) % 7
    target_date = now + timedelta(days=days_ahead)
    
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return int(start_of_day.astimezone(ZoneInfo("UTC")).timestamp()), int(end_of_day.astimezone(ZoneInfo("UTC")).timestamp())

def normalize_to_uif(source: str, raw: list[dict]) -> list[dict]:
    normalized = []
    seen_ids = set()

    for item in raw:
        try:
            if source == "anilist":
                media = item.get("media") if "media" in item else item
                if not media: continue
                
                id_mal = media.get("idMal")
                if id_mal and id_mal in seen_ids:
                    continue
                if id_mal: seen_ids.add(id_mal)
                
                title_romaji = media.get("title", {}).get("romaji")
                title_english = media.get("title", {}).get("english")
                
                entry = {
                    "id": media.get("id"),
                    "id_mal": id_mal,
                    "title_romaji": title_romaji or title_english or "Unknown",
                    "title_english": title_english,
                    "cover_image": media.get("coverImage", {}).get("extraLarge"),
                    "airing_at": item.get("airingAt") or (media.get("nextAiringEpisode") or {}).get("airingAt") or 0,
                    "episode": item.get("episode") or (media.get("nextAiringEpisode") or {}).get("episode") or media.get("episodes") or 0,
                    "source": "anilist"
                }
                
                if "averageScore" in media: entry["average_score"] = media["averageScore"]
                if "episodes" in media: entry["episodes"] = media["episodes"]
                if "genres" in media: entry["genres"] = media["genres"]
                if "description" in media: entry["description"] = media["description"]
                if "status" in media: entry["status"] = media["status"]
                if "format" in media: entry["format"] = media["format"]
                
                normalized.append(entry)

            elif source == "jikan":
                id_mal = item.get("mal_id")
                if id_mal and id_mal in seen_ids:
                    continue
                if id_mal: seen_ids.add(id_mal)
                
                title_romaji = item.get("title")
                title_english = item.get("title_english")
                
                entry = {
                    "id": id_mal, 
                    "id_mal": id_mal,
                    "title_romaji": title_romaji or title_english or "Unknown",
                    "title_english": title_english,
                    "cover_image": item.get("images", {}).get("jpg", {}).get("large_image_url"),
                    "airing_at": 0, 
                    "episode": item.get("episodes", 0),
                    "source": "jikan"
                }
                
                if "score" in item: entry["average_score"] = item["score"]
                if "episodes" in item: entry["episodes"] = item["episodes"]
                if "genres" in item: entry["genres"] = [g.get("name") for g in item.get("genres", [])]
                if "synopsis" in item: entry["description"] = item["synopsis"]
                if "status" in item: entry["status"] = item["status"]
                if "type" in item: entry["format"] = item["type"]
                
                normalized.append(entry)
        except Exception:
            continue
            
    return normalized
