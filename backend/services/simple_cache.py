
# backend/services/simple_cache.py
"""
Simple caching helper.

- Uses Redis if REDIS_URL is set and redis package is installed.
- Otherwise falls back to an in-memory TTL cache (suitable for dev).
"""

import time
import os
import json
from typing import Any, Optional

try:
    import redis
except Exception:
    redis = None  # optional dependency

class SimpleCache:
    def _init_(self):
        self.redis_url = os.getenv("REDIS_URL", "").strip() or None
        if self.redis_url and redis:
            try:
                self.client = redis.from_url(self.redis_url)
            except Exception:
                self.client = None
        else:
            self.client = None
            self._store = {}  # key -> (expire_ts, json_str)

    def get(self, key: str) -> Optional[Any]:
        if self.client:
            try:
                v = self.client.get(key)
            except Exception:
                return None
            if v is None:
                return None
            try:
                return json.loads(v)
            except Exception:
                return None
        else:
            entry = self._store.get(key)
            if not entry:
                return None
            expire_ts, json_str = entry
            if expire_ts != 0 and time.time() > expire_ts:
                del self._store[key]
                return None
            try:
                return json.loads(json_str)
            except Exception:
                return None

    def set(self, key: str, value: Any, ttl: int = 60):
        try:
            payload = json.dumps(value, default=str)
        except Exception:
            # If not JSON-serializable, skip caching
            return
        if self.client:
            try:
                if ttl and ttl > 0:
                    self.client.setex(key, ttl, payload)
                else:
                    self.client.set(key, payload)
            except Exception:
                pass
        else:
            expire_ts = 0 if not ttl else time.time() + ttl
            self._store[key] = (expire_ts, payload)

# single global instance
cache = SimpleCache()