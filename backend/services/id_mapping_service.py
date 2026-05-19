"""id_mapping_service.py
──────────────────────
Phase 5: Local ID Mapping Service — resolves MAL IDs to AniList IDs
without live API calls where possible, and caches resolution results.

Resolution chain (in order):
  1. Local ``id_mapping`` table lookup.
  2. Direct AniList query by idMal.
  3. Title-based AniList search with exact idMal cross-check.
  4. Fuzzy title matching (difflib.SequenceMatcher, threshold ≥ 0.85).
  5. Mark as 'missing' — Jikan fallback handles these externally.

Thread-safe. Respects the shared ``anilist_limiter`` for all API calls.
"""

import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional

from utils.rate_limiter import anilist_limiter

logger = logging.getLogger(__name__)

ANILIST_URL = "https://graphql.anilist.co"
COMMON_HEADERS = {
    "User-Agent": "AnimeTrackerPro/1.0",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

# Fuzzy match threshold (0.0–1.0) — 0.85 means 85% string similarity
_FUZZY_THRESHOLD = 0.85


# ── Internal helpers ─────────────────────────────────────────────────────────

def _get_session():
    """Return a raw SQLAlchemy session (caller must close it)."""
    from database import SessionLocal
    return SessionLocal()


def _get_mapping_row(session, mal_id: int):
    """Fetch the id_mapping row for a given mal_id, or None."""
    from sqlalchemy import text
    return session.execute(
        text("SELECT anilist_id, confidence FROM id_mapping WHERE mal_id = :m"),
        {"m": mal_id},
    ).first()


def _upsert_mapping(session, mal_id: int, anilist_id: Optional[int],
                    confidence: str, title_romaji: Optional[str] = None) -> None:
    """Insert or update an id_mapping row."""
    from sqlalchemy import text
    session.execute(text("""
        INSERT INTO id_mapping (mal_id, anilist_id, confidence, title_romaji, last_checked, created_at)
        VALUES (:mal_id, :anilist_id, :confidence, :title_romaji, now(), now())
        ON CONFLICT (mal_id) DO UPDATE SET
            anilist_id   = EXCLUDED.anilist_id,
            confidence   = EXCLUDED.confidence,
            title_romaji = COALESCE(EXCLUDED.title_romaji, id_mapping.title_romaji),
            last_checked = now()
    """), {
        "mal_id": mal_id,
        "anilist_id": anilist_id,
        "confidence": confidence,
        "title_romaji": title_romaji,
    })
    session.commit()


def _fuzzy_similarity(a: str, b: str) -> float:
    """Return string similarity between a and b using difflib (0.0–1.0)."""
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _query_anilist_by_mal_id(mal_id: int) -> Optional[dict]:
    """
    Step 1: Direct AniList lookup by idMal.
    Returns the raw media dict if found, else None.
    """
    q = """
    query ($id: Int) {
      Media (idMal: $id, type: ANIME) {
        id idMal title { romaji english }
      }
    }
    """
    try:
        anilist_limiter.acquire()
        r = requests.post(
            ANILIST_URL,
            json={"query": q, "variables": {"id": mal_id}},
            headers=COMMON_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("data", {}).get("Media")
    except Exception as e:
        logger.warning("id_mapping: AniList direct lookup failed for MAL %d: %s", mal_id, e)
        return None


def _query_anilist_by_title(title: str) -> list[dict]:
    """
    Steps 2 & 3: AniList title search.
    Returns a list of candidate media dicts.
    """
    q = """
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id idMal title { romaji english }
        }
      }
    }
    """
    try:
        anilist_limiter.acquire()
        r = requests.post(
            ANILIST_URL,
            json={"query": q, "variables": {"search": title}},
            headers=COMMON_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("data", {}).get("Page", {}).get("media", [])
    except Exception as e:
        logger.warning("id_mapping: AniList title search failed for '%s': %s", title, e)
        return []


# ── Public API ────────────────────────────────────────────────────────────────

def get_anilist_id(mal_id: int) -> Optional[int]:
    """
    Return the AniList ID for a given MAL ID.

    Checks the local ``id_mapping`` table first. If the mapping is:
    - ``verified`` or ``inferred``: returns ``anilist_id`` immediately.
    - ``missing``: returns ``None`` immediately (no API call).
    - Not found: triggers ``resolve_id()`` and returns the result.

    Args:
        mal_id: The MyAnimeList ID to look up.

    Returns:
        The AniList ID as an int, or ``None`` if unmappable.
    """
    session = _get_session()
    try:
        row = _get_mapping_row(session, mal_id)
        if row is not None:
            anilist_id, confidence = row
            if confidence in ("verified", "inferred"):
                return anilist_id
            if confidence == "missing":
                return None  # Already known to be unmappable — skip API call
        # Not in table — run full resolution
    finally:
        session.close()

    result = resolve_id(mal_id)
    return result.get("anilist_id")


def resolve_id(mal_id: int, title_romaji: Optional[str] = None) -> dict:
    """
    Resolve a MAL ID to an AniList ID using a multi-step chain.

    Resolution order:
      1. Direct AniList query by idMal.
      2. Title search + exact idMal cross-check (if title_romaji provided).
      3. Fuzzy title match (similarity ≥ 85%).
      4. Mark as 'missing'.

    The result is persisted to the ``id_mapping`` table before returning.

    Args:
        mal_id:       The MAL ID to resolve.
        title_romaji: Optional title hint to improve title-based resolution.

    Returns:
        A dict with keys ``mal_id``, ``anilist_id`` (int or None), ``confidence``.
    """
    # Step 1: Direct lookup by idMal
    media = _query_anilist_by_mal_id(mal_id)
    if media and media.get("id"):
        anilist_id = media["id"]
        title = media.get("title", {}).get("romaji") or title_romaji
        _persist(mal_id, anilist_id, "verified", title)
        return {"mal_id": mal_id, "anilist_id": anilist_id, "confidence": "verified"}

    # Steps 2 & 3: Title-based search (only if title hint is available)
    if title_romaji:
        candidates = _query_anilist_by_title(title_romaji)

        # Step 2: Exact idMal cross-check
        for candidate in candidates:
            if candidate.get("idMal") == mal_id:
                anilist_id = candidate["id"]
                _persist(mal_id, anilist_id, "verified", title_romaji)
                return {"mal_id": mal_id, "anilist_id": anilist_id, "confidence": "verified"}

        # Step 3: Fuzzy match
        for candidate in candidates:
            candidate_title = (
                (candidate.get("title") or {}).get("romaji")
                or (candidate.get("title") or {}).get("english")
                or ""
            )
            if _fuzzy_similarity(title_romaji, candidate_title) >= _FUZZY_THRESHOLD:
                anilist_id = candidate["id"]
                _persist(mal_id, anilist_id, "inferred", title_romaji)
                return {"mal_id": mal_id, "anilist_id": anilist_id, "confidence": "inferred"}

    # Step 4: Mark as missing — a Jikan fallback will handle this externally
    _persist(mal_id, None, "missing", title_romaji)
    return {"mal_id": mal_id, "anilist_id": None, "confidence": "missing"}


def _persist(mal_id: int, anilist_id: Optional[int], confidence: str,
             title_romaji: Optional[str]) -> None:
    """Persist a mapping result. Silently swallows DB errors."""
    session = _get_session()
    try:
        _upsert_mapping(session, mal_id, anilist_id, confidence, title_romaji)
    except Exception as e:
        logger.error("id_mapping: Failed to persist mapping for MAL %d: %s", mal_id, e)
        session.rollback()
    finally:
        session.close()


def batch_resolve_ids(mal_ids: list) -> dict:
    """
    Bulk-resolve a list of MAL IDs to AniList IDs.

    Checks the mapping table for all IDs in a single query first; only calls
    ``resolve_id()`` for IDs not already mapped. Respects ``anilist_limiter``
    through the resolve_id → _query_anilist_by_mal_id chain.

    Args:
        mal_ids: List of MAL IDs (integers).

    Returns:
        Dict of ``{mal_id: anilist_id | None}`` for every input MAL ID.
    """
    if not mal_ids:
        return {}

    result: dict = {}
    to_resolve: list = []

    session = _get_session()
    try:
        from sqlalchemy import text
        rows = session.execute(
            text("SELECT mal_id, anilist_id, confidence FROM id_mapping WHERE mal_id = ANY(:ids)"),
            {"ids": mal_ids},
        ).fetchall()
        mapped = {r[0]: (r[1], r[2]) for r in rows}
    except Exception as e:
        logger.error("batch_resolve_ids: DB query failed: %s", e)
        mapped = {}
    finally:
        session.close()

    for mid in mal_ids:
        if mid in mapped:
            anilist_id, confidence = mapped[mid]
            if confidence in ("verified", "inferred"):
                result[mid] = anilist_id
            else:  # 'missing'
                result[mid] = None
        else:
            to_resolve.append(mid)

    for mid in to_resolve:
        resolved = resolve_id(mid)
        result[mid] = resolved.get("anilist_id")

    return result


def refresh_missing_mappings() -> None:
    """
    Background job: re-attempt resolution for all 'missing' entries
    where ``last_checked`` is older than 7 days.

    AniList may have added the mapping since the last attempt.
    Respects rate limiting — runs at low priority.
    """
    from sqlalchemy import text

    session = _get_session()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        stale = session.execute(
            text("""
                SELECT mal_id, title_romaji FROM id_mapping
                WHERE confidence = 'missing' AND last_checked < :cutoff
            """),
            {"cutoff": cutoff},
        ).fetchall()
    except Exception as e:
        logger.error("refresh_missing_mappings: DB query failed: %s", e)
        return
    finally:
        session.close()

    logger.info("refresh_missing_mappings: found %d stale 'missing' entries to retry.", len(stale))

    for mal_id, title_romaji in stale:
        try:
            result = resolve_id(mal_id, title_romaji)
            logger.info(
                "refresh_missing_mappings: MAL %d → AniList %s (confidence=%s)",
                mal_id, result.get("anilist_id"), result.get("confidence"),
            )
        except Exception as e:
            logger.warning("refresh_missing_mappings: Failed for MAL %d: %s", mal_id, e)
