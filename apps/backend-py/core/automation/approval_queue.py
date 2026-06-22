import uuid
import json
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional
from core.database import db_run, db_all, db_get

class ApprovalStatus(Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"

class ApprovalQueue:
    """
    Manages the lifecycle of high-risk actions.
    Actions sit in PENDING state until the Founder explicitly approves or rejects them.
    """

    @staticmethod
    async def create_request(agent_id: str, action: str, capability: str, risk: str, cost: float, context: Dict[str, Any]) -> str:
        request_id = f"appr-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()
        
        await db_run(
            """
            INSERT INTO approval_queue (id, agent_id, action, capability, risk, cost, status, context, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (request_id, agent_id, action, capability, risk, cost, ApprovalStatus.PENDING.value, json.dumps(context), timestamp)
        )
        return request_id

    @staticmethod
    async def get_pending() -> List[Dict[str, Any]]:
        return await db_all("SELECT * FROM approval_queue WHERE status = ?", (ApprovalStatus.PENDING.value,))

    @staticmethod
    async def update_status(request_id: str, status: ApprovalStatus, resolved_by: Optional[str] = "Founder") -> None:
        timestamp = datetime.utcnow().isoformat()
        await db_run(
            """
            UPDATE approval_queue 
            SET status = ?, resolved_at = ?, resolved_by = ?
            WHERE id = ?
            """,
            (status.value, timestamp, resolved_by, request_id)
        )
