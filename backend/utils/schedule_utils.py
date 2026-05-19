"""
schedule_utils.py
─────────────────
Shared exception classes, timezone utilities, and the Unified Interchange
Format (UIF) normaliser that brings AniList and Jikan responses into a
common shape consumed by the schedule and seasonal endpoints.

Phase 3: All UIF entries now carry an ``aid`` field containing a namespaced
         ID string (``"anilist_<id>"`` or ``"mal_<id>"``) so that React list
         keys can never collide between ID spaces.

Phase 6: UIF entries now carry all three title variants (``title_english``,
         ``title_romaji``, ``title_native``) plus a ``title_sort`` sort key
         computed by ``compute_sort_title()``.
"""

import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from utils.title_utils import compute_sort_title


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
    valid_days = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
                  "friday": 4, "saturday": 5, "sunday": 6}
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
    end_of_day   = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    return (
        int(start_of_day.astimezone(ZoneInfo("UTC")).timestamp()),
        int(end_of_day.astimezone(ZoneInfo("UTC")).timestamp()),
    )


def _make_aid(anilist_id, mal_id):
    """Phase 3: Namespaced ID string for use as a React list key."""
    if anilist_id:
        return f"anilist_{anilist_id}"
    if mal_id:
        return f"mal_{mal_id}"
    return None


def normalize_to_uif(source: str, raw: list[dict]) -> list[dict]:
    """
    Transform raw AniList or Jikan responses into the Unified Interchange
    Format (UIF) consumed by schedule, seasonal, and discover endpoints.

    Phase 3 additions: every entry gains an ``aid`` field with a namespaced
    ID string (``"anilist_<id>"`` or ``"mal_<id>"``).

    Phase 6 additions: every entry gains ``title_english``, ``title_romaji``,
    ``title_native``, and ``title_sort``. For Jikan entries, ``title_english``
    falls back to ``title_romaji`` when the English title is absent.

    The existing ``title`` field is preserved unchanged so existing frontend
    consumers are unaffected.
    """
    normalized = []
    seen_ids: set = set()

    for item in raw:
        try:
            # ── AniList source ────────────────────────────────────────────────
            if source == "anilist":
                media = item.get("media") if "media" in item else item
                if not media:
                    continue

                id_mal = media.get("idMal")
                anilist_id = media.get("id")

                if id_mal and id_mal in seen_ids:
                    continue
                if id_mal:
                    seen_ids.add(id_mal)

                # Phase 6: extract all three title variants
                title_block = media.get("title", {})
                title_romaji  = title_block.get("romaji")
                title_english = title_block.get("english")
                title_native  = title_block.get("native")
                # Best display title (English first, romaji fallback)
                display_title = title_english or title_romaji or "Unknown"

                entry = {
                    "id": anilist_id,
                    "id_mal": id_mal,
                    # Phase 3: namespaced key
                    "aid": _make_aid(anilist_id, id_mal),
                    # Legacy title field — preserved for backward compatibility
                    "title": display_title,
                    # Phase 6: explicit title variants
                    "title_romaji": title_romaji or display_title,
                    "title_english": title_english or title_romaji or "Unknown",
                    "title_native": title_native,
                    # Phase 6: normalised sort key
                    "title_sort": compute_sort_title(title_english or title_romaji),
                    "cover_image": media.get("coverImage", {}).get("extraLarge"),
                    "airing_at": (
                        item.get("airingAt")
                        or (media.get("nextAiringEpisode") or {}).get("airingAt")
                        or 0
                    ),
                    "episode": (
                        item.get("episode")
                        or (media.get("nextAiringEpisode") or {}).get("episode")
                        or media.get("episodes")
                        or 0
                    ),
                    "source": "anilist",
                }

                if "averageScore" in media: entry["average_score"] = media["averageScore"]
                if "episodes"     in media: entry["episodes"]      = media["episodes"]
                if "genres"       in media: entry["genres"]        = media["genres"]
                if "description"  in media: entry["description"]   = media["description"]
                if "status"       in media: entry["status"]        = media["status"]
                if "format"       in media: entry["format"]        = media["format"]

                normalized.append(entry)

            # ── Jikan source ──────────────────────────────────────────────────
            elif source == "jikan":
                id_mal = item.get("mal_id")
                if id_mal and id_mal in seen_ids:
                    continue
                if id_mal:
                    seen_ids.add(id_mal)

                # Phase 6: Jikan title mapping
                title_romaji  = item.get("title")          # Jikan 'title' is romaji
                title_english = item.get("title_english")
                title_native  = item.get("title_japanese")

                # Phase 6: never leave title_english null — fall back to romaji
                if not title_english:
                    title_english = title_romaji

                display_title = title_english or title_romaji or "Unknown"

                entry = {
                    "id": id_mal,
                    "id_mal": id_mal,
                    # Phase 3: namespaced key (always "mal_" for Jikan)
                    "aid": _make_aid(None, id_mal),
                    # Legacy title field
                    "title": display_title,
                    # Phase 6: explicit title variants
                    "title_romaji": title_romaji or display_title,
                    "title_english": title_english,
                    "title_native": title_native,
                    # Phase 6: normalised sort key
                    "title_sort": compute_sort_title(title_english or title_romaji),
                    "cover_image": item.get("images", {}).get("jpg", {}).get("large_image_url"),
                    "airing_at": 0,
                    "episode": item.get("episodes", 0),
                    "source": "jikan",
                }

                if "score"    in item: entry["average_score"] = item["score"]
                if "episodes" in item: entry["episodes"]      = item["episodes"]
                if "genres"   in item: entry["genres"]        = [g.get("name") for g in item.get("genres", [])]
                if "synopsis" in item: entry["description"]   = item["synopsis"]
                if "status"   in item: entry["status"]        = item["status"]
                if "type"     in item: entry["format"]        = item["type"]

                normalized.append(entry)

        except Exception:
            continue

    return normalized
