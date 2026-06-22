from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class CommsService:
    @staticmethod
    async def escalate_issue(title: str, description: str, sender: str, recipient: str, severity: str = "HIGH"):
        comms_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO system_communications (id, type, title, description, sender, recipient, severity, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [comms_id, "ESCALATION", title, description, sender, recipient, severity, "OPEN", datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat()]
        )
        return comms_id

    @staticmethod
    async def get_open_escalations():
        return await db_all("SELECT * FROM system_communications WHERE type = 'ESCALATION' AND status = 'OPEN' ORDER BY created_at DESC")

    @staticmethod
    async def resolve_communication(comms_id: str):
        await db_run("UPDATE system_communications SET status = 'RESOLVED', updated_at = ? WHERE id = ?", 
                    [datetime.now(timezone.utc).isoformat(), comms_id])

comms_service = CommsService()
