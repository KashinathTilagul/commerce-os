"""
EKVAAR OS - Intelligence Layer: Provider Audit Layer
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run

class ProviderAudit:
    @staticmethod
    async def log_call(task_id: str, capability_id: str, provider_id: str, cost: float, latency_ms: int, was_successful: bool) -> None:
        """
        Records the granular execution metrics of a provider call.
        """
        audit_id = f"iaud_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO intel_audit_log (id, task_id, capability_id, provider_id, cost, latency_ms, was_successful, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [audit_id, task_id, capability_id, provider_id, cost, latency_ms, 1 if was_successful else 0, created_at]
        )

        # Update the rolling reliability score of the provider in the registry (mocked simplified logic)
        if not was_successful:
            await db_run(
                "UPDATE intel_providers SET reliability_score = reliability_score * 0.95 WHERE id = ?",
                [provider_id]
            )
