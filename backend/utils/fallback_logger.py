"""
fallback_logger.py
──────────────────
Phase 1: Observability — AniList → Jikan fallback event logging and rate tracking.

Writes structured fallback events to `fallback_events.log` alongside the app logs,
and maintains an in-memory sliding-window counter per endpoint to emit
DEGRADATION_ALERT warnings when a single endpoint exceeds 10 fallbacks in 5 minutes.
"""

import logging
import threading
from collections import deque, defaultdict
from datetime import datetime, timezone
from typing import Optional

# ── Dedicated fallback log (separate from general app logs) ──────────────────
_fallback_log = logging.getLogger("fallback_events")

if not _fallback_log.handlers:
    _handler = logging.FileHandler("fallback_events.log", encoding="utf-8")
    _handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%SZ")
    )
    _fallback_log.addHandler(_handler)
    _fallback_log.setLevel(logging.INFO)
    _fallback_log.propagate = False  # Keep out of the general server log

# General server logger (used for DEGRADATION_ALERT — must be visible in server output)
_server_log = logging.getLogger(__name__)

# ── In-memory rate tracker: { endpoint: deque[timestamp_float] } ─────────────
_WINDOW_SECONDS = 300          # 5-minute rolling window
_ALERT_THRESHOLD = 10          # fallbacks per window that trigger a warning
_lock = threading.Lock()
_window: dict[str, deque] = defaultdict(deque)  # thread-safe via the lock


def log_fallback_event(
    endpoint: str,
    reason: str,
    mal_id: Optional[int] = None,
    anilist_id: Optional[int] = None,
) -> None:
    """
    Record a single AniList → Jikan fallback event.

    Call this at the START of every except/fallback block, BEFORE the Jikan call.

    Args:
        endpoint:   The name of the function that failed (e.g. ``"fetch_anilist"``).
        reason:     Human-readable failure reason — use the actual exception type or
                    HTTP status code string, e.g. ``"timeout"``, ``"403"``, ``"500"``,
                    ``"404"``, or ``"ConnectionError"``.
        mal_id:     MAL ID of the anime being fetched, if known.
        anilist_id: AniList ID of the anime being fetched, if known.
    """
    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()

    # Write structured event to fallback_events.log
    _fallback_log.info(
        "FALLBACK endpoint=%s reason=%s mal_id=%s anilist_id=%s",
        endpoint,
        reason,
        mal_id if mal_id is not None else "null",
        anilist_id if anilist_id is not None else "null",
    )

    # Update sliding-window rate counter
    with _lock:
        dq = _window[endpoint]
        # Evict entries outside the rolling window
        cutoff = now_ts - _WINDOW_SECONDS
        while dq and dq[0] < cutoff:
            dq.popleft()
        dq.append(now_ts)
        count = len(dq)

    # Emit a server-log DEGRADATION_ALERT if the threshold is crossed
    if count > _ALERT_THRESHOLD:
        _server_log.warning(
            "⚠️  DEGRADATION_ALERT: endpoint '%s' has triggered %d fallbacks in the last 5 minutes "
            "(threshold=%d). AniList may be degraded.",
            endpoint,
            count,
            _ALERT_THRESHOLD,
        )


# ── Metrics helpers used by the /internal/api-health endpoint ────────────────

def get_active_degradation_alerts() -> list[str]:
    """
    Return a list of endpoint names whose fallback count currently exceeds
    the alert threshold within the 5-minute rolling window.
    """
    now_ts = datetime.now(timezone.utc).timestamp()
    cutoff = now_ts - _WINDOW_SECONDS
    alerts: list[str] = []
    with _lock:
        for endpoint, dq in _window.items():
            active = sum(1 for ts in dq if ts >= cutoff)
            if active > _ALERT_THRESHOLD:
                alerts.append(endpoint)
    return alerts


def get_fallback_window_counts() -> dict[str, int]:
    """Return current within-window fallback count per endpoint."""
    now_ts = datetime.now(timezone.utc).timestamp()
    cutoff = now_ts - _WINDOW_SECONDS
    with _lock:
        return {ep: sum(1 for ts in dq if ts >= cutoff) for ep, dq in _window.items()}


def parse_fallback_log_last_hour() -> dict:
    """
    Parse ``fallback_events.log`` backwards to produce a summary of the last 60 minutes.
    Stops reading as soon as it encounters a log entry older than 60 minutes.

    Returns a dict with:
        - ``total``: int — total fallback events in the last hour
        - ``breakdown``: dict[endpoint, dict[reason, count]]
    """
    import os
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    total = 0
    breakdown: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    log_path = "fallback_events.log"
    if not os.path.exists(log_path):
        return {"total": 0, "breakdown": {}}

    try:
        with open(log_path, "rb") as f:
            try:
                f.seek(0, os.SEEK_END)
                file_size = f.tell()
            except OSError:
                file_size = 0

            if file_size == 0:
                return {"total": 0, "breakdown": {}}

            buffer_size = 8192
            buffer = bytearray()
            pointer = file_size
            done = False

            while pointer > 0 and not done:
                to_read = min(buffer_size, pointer)
                pointer -= to_read
                f.seek(pointer)
                chunk = f.read(to_read)
                buffer = chunk + buffer

                lines = buffer.split(b"\n")
                
                if pointer > 0:
                    buffer = lines[0]
                    lines_to_process = lines[1:]
                else:
                    buffer = bytearray()
                    lines_to_process = lines

                for bline in reversed(lines_to_process):
                    line = bline.decode("utf-8", errors="ignore").strip()
                    if not line:
                        continue
                    if "FALLBACK" not in line:
                        continue

                    try:
                        # Line format: 2026-05-17T12:00:00Z INFO FALLBACK endpoint=X reason=Y ...
                        parts = line.split()
                        ts_str = parts[0]
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        if ts < cutoff:
                            done = True
                            break

                        kv = {}
                        for token in parts[3:]:
                            if "=" in token:
                                k, v = token.split("=", 1)
                                kv[k] = v

                        endpoint = kv.get("endpoint", "unknown")
                        reason = kv.get("reason", "unknown")
                        breakdown[endpoint][reason] += 1
                        total += 1
                    except Exception:
                        continue
    except Exception:
        pass

    return {
        "total": total,
        "breakdown": {ep: dict(reasons) for ep, reasons in breakdown.items()},
    }
