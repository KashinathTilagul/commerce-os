"""
EKVAAR OS - Workforce Runtime: Collaboration Runtime
"""
import uuid
import json
from datetime import datetime, timezone
from core.database import db_run

class CollaborationRuntime:
    @staticmethod
    async def create_task_force(objective_id: str, participating_employees: list, shared_task_payload: dict) -> str:
        """
        Spawns a temporary task force across multiple departments.
        E.g. Research + Marketing + Growth for a 'Product Opportunity Analysis'.
        """
        # A simple implementation replicates the task to each employee's queue with a shared parent_id
        parent_task_id = f"collab_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        for emp_id in participating_employees:
            sub_task_id = f"sub_{uuid.uuid4().hex}"
            payload = shared_task_payload.copy()
            payload["parent_task"] = parent_task_id
            
            await db_run(
                """
                INSERT INTO workforce_tasks (id, status, assigned_to, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [sub_task_id, "PENDING", emp_id, json.dumps(payload), created_at]
            )
            
        return parent_task_id
