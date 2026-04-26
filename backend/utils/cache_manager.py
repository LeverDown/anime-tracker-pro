import json
import time
import logging
from typing import Any, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class CacheManager:
    def __init__(self, host='localhost', port=6379, db=0, default_ttl=3600):
        self.default_ttl = default_ttl
        self.use_redis = False
        self.redis_client = None
        self._memory_cache = {}

        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host=host, 
                    port=port, 
                    db=db, 
                    socket_connect_timeout=2,
                    decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                self.use_redis = True
                logger.info("✅ Redis Cache initialized successfully.")
            except Exception as e:
                logger.warning(f"⚠️ Redis not available ({e}). Falling back to In-Memory cache.")
                self.use_redis = False

    def get(self, key: str) -> Optional[Any]:
        if self.use_redis:
            try:
                data = self.redis_client.get(key)
                return json.loads(data) if data else None
            except Exception as e:
                logger.error(f"Redis GET Error: {e}")
                return None
        else:
            # Memory fallback
            item = self._memory_cache.get(key)
            if item:
                val, expiry = item
                if expiry is None or time.time() < expiry:
                    return val
                else:
                    del self._memory_cache[key]
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl if ttl is not None else self.default_ttl
        
        if self.use_redis:
            try:
                self.redis_client.setex(key, ttl, json.dumps(value))
            except Exception as e:
                logger.error(f"Redis SET Error: {e}")
        else:
            # Memory fallback
            expiry = time.time() + ttl
            self._memory_cache[key] = (value, expiry)

    def delete(self, key: str):
        if self.use_redis:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis DELETE Error: {e}")
        else:
            if key in self._memory_cache:
                del self._memory_cache[key]

# Singleton instance
cache = CacheManager(default_ttl=3600)
