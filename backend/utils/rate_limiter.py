"""
rate_limiter.py
───────────────
Phase 2: Token-bucket / sliding-window rate limiter for AniList API calls.

Design goals:
  - No blocking time.sleep() — callers wait the minimum necessary time.
  - Thread-safe for concurrent background workers via a threading.Lock.
  - Redis-backed if available (shares the same Redis the app already uses);
    falls back to an in-process deque-based sliding window otherwise.
  - Singleton ``anilist_limiter`` exported for module-level import.
  - Default: 85 requests per 60 seconds (under AniList's 90 req/min limit).

Usage::

    from utils.rate_limiter import anilist_limiter

    anilist_limiter.acquire()   # blocks for at most the remaining window time
    response = requests.post(...)
"""

import time
import logging
import threading
from collections import deque
from typing import Optional

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Sliding-window rate limiter.

    Uses Redis INCR/EXPIRE when Redis is available so that multiple worker
    processes share a single counter. Falls back to an in-process threading.Lock
    + deque-based sliding window for single-process deployments.

    Args:
        max_requests:   Maximum number of requests allowed in ``window_seconds``.
        window_seconds: Duration of the sliding window in seconds.
        redis_client:   Optional pre-initialised Redis client. If ``None``, the
                        limiter attempts to import ``utils.cache_manager.cache``
                        and reuse its Redis connection.
        name:           Human-readable label for log messages.
    """

    def __init__(
        self,
        max_requests: int = 85,
        window_seconds: int = 60,
        redis_client=None,
        name: str = "anilist",
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.name = name
        self._lock = threading.Lock()
        self._timestamps: deque = deque()  # in-process fallback
        self._redis: Optional[object] = None

        # Try to reuse the existing CacheManager's Redis connection
        if redis_client is not None:
            self._redis = redis_client
        else:
            try:
                from utils.cache_manager import cache
                if cache.use_redis and cache.redis_client:
                    self._redis = cache.redis_client
                    logger.info("RateLimiter '%s': using Redis backend.", self.name)
            except Exception:
                pass

        if not self._redis:
            logger.info(
                "RateLimiter '%s': Redis unavailable, using in-process sliding window.",
                self.name,
            )

    # ── Public API ────────────────────────────────────────────────────────────

    def acquire(self) -> None:
        """
        Acquire a rate-limit token, blocking if necessary.

        This method sleeps for the minimum required time if the current window
        is already at capacity, then returns as soon as a slot opens.
        It NEVER raises an exception — it only throttles transparently.
        """
        if self._redis:
            self._acquire_redis()
        else:
            self._acquire_local()

    # ── Redis-backed implementation ───────────────────────────────────────────

    def _acquire_redis(self) -> None:
        """Use Redis ZSET to enforce a true sliding-window rate limit."""
        redis_key = f"ratelimit:{self.name}:window"
        import uuid
        while True:
            try:
                now = time.time()
                cutoff = now - self.window_seconds
                member = f"{now}:{uuid.uuid4()}"

                pipe = self._redis.pipeline()
                # 1. Remove elements older than cutoff
                pipe.zremrangebyscore(redis_key, 0, cutoff)
                # 2. Add current request member with score as timestamp
                pipe.zadd(redis_key, {member: now})
                # 3. Count remaining active requests in the sliding window
                pipe.zcard(redis_key)
                # 4. Refresh key TTL safely
                pipe.expire(redis_key, self.window_seconds + 5)
                
                results = pipe.execute()
                count = results[2]  # Result of ZCARD

                if count <= self.max_requests:
                    return  # Slot available — proceed immediately

                # Window is full; remove the member we just added to keep ZSET clean
                self._redis.zrem(redis_key, member)

                # Fetch the oldest element in the ZSET to calculate sleep duration
                oldest_elements = self._redis.zrange(redis_key, 0, 0, withscores=True)
                if oldest_elements:
                    oldest_score = oldest_elements[0][1]
                    sleep_for = (oldest_score + self.window_seconds) - now + 0.05
                else:
                    sleep_for = 1.0

                logger.debug(
                    "RateLimiter '%s': Redis count=%d/%d — throttling.",
                    self.name, count, self.max_requests,
                )
                time.sleep(max(sleep_for, 0.05))
            except Exception as e:
                logger.warning(
                    "RateLimiter '%s': Redis error (%s) — falling back to local.",
                    self.name, e,
                )
                self._acquire_local()
                return

    # ── In-process sliding-window implementation ──────────────────────────────

    def _acquire_local(self) -> None:
        """Deque-based sliding-window rate limiter (single-process only)."""
        while True:
            with self._lock:
                now = time.monotonic()
                cutoff = now - self.window_seconds

                # Evict timestamps outside the window
                while self._timestamps and self._timestamps[0] < cutoff:
                    self._timestamps.popleft()

                if len(self._timestamps) < self.max_requests:
                    # Slot available — record timestamp and return
                    self._timestamps.append(now)
                    return

                # Window is full; calculate how long until the oldest slot expires
                oldest = self._timestamps[0]
                sleep_for = (oldest + self.window_seconds) - now + 0.05  # +50ms buffer

            # Sleep outside the lock to allow other threads to proceed
            logger.debug(
                "RateLimiter '%s': window full (%d/%d) — sleeping %.2fs.",
                self.name, len(self._timestamps), self.max_requests, sleep_for,
            )
            time.sleep(max(sleep_for, 0.05))


# ── Singleton — import this in every module that calls AniList ────────────────
# Default: 85 req / 60 sec — safely under AniList's 90 req/min ceiling.
anilist_limiter = RateLimiter(max_requests=85, window_seconds=60, name="anilist")
