"""
EKVAAR OS - Intelligence Layer: Intelligence Cache
"""
import uuid
import hashlib
from datetime import datetime, timezone
from core.database import db_run, db_get

class IntelligenceCache:
    @staticmethod
    def _hash_query(capability: str, prompt: str) -> str:
        """Creates a unique deterministic hash for the request."""
        raw = f"{capability}::{prompt}".encode('utf-8')
        return hashlib.sha256(raw).hexdigest()

    @staticmethod
    async def get_cached_response(capability: str, prompt: str) -> str:
        """
        Checks if we've asked this exact question before.
        """
        q_hash = IntelligenceCache._hash_query(capability, prompt)
        row = await db_get("SELECT response_payload FROM intel_cache WHERE query_hash = ?", [q_hash])
        
        if row:
            # Update hit count
            await db_run("UPDATE intel_cache SET hit_count = hit_count + 1, last_accessed = ? WHERE query_hash = ?", [datetime.now(timezone.utc).isoformat(), q_hash])
            return row["response_payload"]
            
        return None

    @staticmethod
    async def cache_response(capability: str, prompt: str, response: str) -> None:
        """Saves a response to prevent duplicate API costs."""
        q_hash = IntelligenceCache._hash_query(capability, prompt)
        cache_id = f"cache_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT OR IGNORE INTO intel_cache (id, query_hash, response_payload, created_at, last_accessed, hit_count)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            [cache_id, q_hash, response, now, now]
        )
