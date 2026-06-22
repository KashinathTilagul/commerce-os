"""
EKVAAR OS - Workforce Runtime: Objective Management System
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run

class ObjectiveManager:
    @staticmethod
    async def create_objective(title: str) -> str:
        """
        Creates a new top-level objective.
        By default, it starts in PENDING_CEO_PLAN status, ensuring it does NOT auto-execute.
        """
        obj_id = f"obj_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO rt_objectives (id, title, status, progress, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [obj_id, title, "PENDING_CEO_PLAN", 0.0, created_at]
        )
        return obj_id

    @staticmethod
    async def submit_for_governance_review(obj_id: str) -> None:
        await db_run("UPDATE rt_objectives SET status = 'PENDING_GOVERNANCE_REVIEW' WHERE id = ?", [obj_id])

    @staticmethod
    async def submit_for_founder_approval(obj_id: str) -> None:
        await db_run("UPDATE rt_objectives SET status = 'PENDING_FOUNDER_APPROVAL' WHERE id = ?", [obj_id])

    @staticmethod
    async def activate_runtime(obj_id: str) -> None:
        """Only triggered AFTER Founder Approval."""
        await db_run("UPDATE rt_objectives SET status = 'RUNTIME_ACTIVATED' WHERE id = ?", [obj_id])
