from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class ObjectiveService:
    @staticmethod
    async def create_objective(title: str, description: str, target_date: str = None):
        obj_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO system_objectives (id, title, description, status, target_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [obj_id, title, description, "ACTIVE", target_date, datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat()]
        )
        return obj_id

    @staticmethod
    async def get_active_objectives():
        return await db_all("SELECT * FROM system_objectives WHERE status = 'ACTIVE' ORDER BY created_at DESC")

    @staticmethod
    async def update_objective_status(obj_id: str, status: str):
        await db_run("UPDATE system_objectives SET status = ?, updated_at = ? WHERE id = ?", 
                    [status, datetime.now(timezone.utc).isoformat(), obj_id])

objective_service = ObjectiveService()
