from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class ApprovalService:
    @staticmethod
    async def queue_approval(title: str, description: str, context: str, requester: str, risk: str = "LOW", cost: float = 0.0):
        approval_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO system_approvals (id, title, description, context, requester, risk, cost, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [approval_id, title, description, context, requester, risk, cost, "PENDING", datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat()]
        )
        return approval_id

    @staticmethod
    async def get_pending_approvals():
        return await db_all("SELECT * FROM system_approvals WHERE status = 'PENDING' ORDER BY created_at ASC")

    @staticmethod
    async def resolve_approval(approval_id: str, status: str, resolver: str = "founder"):
        await db_run(
            "UPDATE system_approvals SET status = ?, resolved_by = ?, updated_at = ? WHERE id = ?",
            [status, resolver, datetime.now(timezone.utc).isoformat(), approval_id]
        )

approval_service = ApprovalService()
