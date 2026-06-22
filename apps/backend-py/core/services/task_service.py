from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class TaskService:
    @staticmethod
    async def create_task(title: str, description: str, owner: str, status: str = "PENDING", context: str = None, priority: str = "NORMAL"):
        task_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO system_tasks (id, title, description, status, owner, context, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [task_id, title, description, status, owner, context, priority, datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat()]
        )
        return task_id

    @staticmethod
    async def get_task(task_id: str):
        return await db_get("SELECT * FROM system_tasks WHERE id = ?", [task_id])

    @staticmethod
    async def get_tasks_by_owner(owner: str, status: str = None):
        if status:
            return await db_all("SELECT * FROM system_tasks WHERE owner = ? AND status = ? ORDER BY created_at DESC", [owner, status])
        return await db_all("SELECT * FROM system_tasks WHERE owner = ? ORDER BY created_at DESC", [owner])

    @staticmethod
    async def get_all_tasks(limit: int = 100):
        return await db_all("SELECT * FROM system_tasks ORDER BY created_at DESC LIMIT ?", [limit])

    @staticmethod
    async def update_task_status(task_id: str, status: str, completion_pct: int = None):
        if completion_pct is not None:
            await db_run("UPDATE system_tasks SET status = ?, completion_pct = ?, updated_at = ? WHERE id = ?", 
                        [status, completion_pct, datetime.now(timezone.utc).isoformat(), task_id])
        else:
            await db_run("UPDATE system_tasks SET status = ?, updated_at = ? WHERE id = ?", 
                        [status, datetime.now(timezone.utc).isoformat(), task_id])

task_service = TaskService()
