"""
EKVAAR OS - Intelligence Layer: Provider Registry
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get, db_all

class ProviderRegistry:
    @staticmethod
    async def register_provider(name: str, model: str, cost_per_1k: float, latency_ms: int, reliability_score: float, accuracy_score: float) -> str:
        provider_id = f"prov_{uuid.uuid4().hex}"
        updated_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO intel_providers (id, name, model, cost_per_1k, latency_ms, reliability_score, accuracy_score, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [provider_id, name, model, cost_per_1k, latency_ms, reliability_score, accuracy_score, "ACTIVE", updated_at]
        )
        return provider_id

    @staticmethod
    async def get_active_providers() -> list:
        return await db_all("SELECT * FROM intel_providers WHERE status = 'ACTIVE'")

    @staticmethod
    async def update_status(provider_id: str, status: str) -> None:
        await db_run("UPDATE intel_providers SET status = ?, updated_at = ? WHERE id = ?", [status, datetime.now(timezone.utc).isoformat(), provider_id])
