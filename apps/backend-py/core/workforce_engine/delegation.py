"""
EKVAAR OS - Workforce Engine: Delegation Engine
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from core.database import db_run, db_get, db_all
from core.events.bus import event_bus
from core.workforce_engine.state_manager import WorkforceStateManager

class WorkforceDelegationEngine:
    @staticmethod
    async def create_task(
        title: str,
        description: str,
        owner: str,
        reviewer: str,
        department: str,
        priority: str = "NORMAL",
        due_date: str = None,
        parent_id: str = None
    ) -> str:
        """Create a new task, optionally nested under a parent task."""
        task_id = f"task_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO workforce_tasks 
            (id, parent_id, owner, reviewer, department, priority, status, title, description, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [task_id, parent_id, owner, reviewer, department, priority, "PENDING", title, description, due_date, now, now]
        )

        # Update owner's capacity state (optimistic)
        state = await WorkforceStateManager.get_employee_state(owner)
        await WorkforceStateManager.update_employee_state(
            employee_id=owner,
            stress_level=min(100.0, state["stress_level"] + 5.0),
            capacity=max(0.0, state["capacity"] - 10.0),
            active_tasks=state["active_tasks"] + 1
        )

        await event_bus.emit("TaskCreated", payload={
            "task_id": task_id,
            "parent_id": parent_id,
            "owner": owner,
            "title": title
        })

        return task_id

    @staticmethod
    async def get_task(task_id: str) -> Optional[Dict[str, Any]]:
        return await db_get("SELECT * FROM workforce_tasks WHERE id = ?", [task_id])

    @staticmethod
    async def get_child_tasks(parent_id: str) -> List[Dict[str, Any]]:
        """Retrieve all immediate child tasks for a given parent."""
        return await db_all("SELECT * FROM workforce_tasks WHERE parent_id = ?", [parent_id])

    @staticmethod
    async def complete_task(task_id: str, trigger_experience: bool = True) -> None:
        """Mark a task as completed and check parent dependencies."""
        now = datetime.now(timezone.utc).isoformat()
        task = await WorkforceDelegationEngine.get_task(task_id)
        if not task:
            return

        await db_run(
            "UPDATE workforce_tasks SET status = 'COMPLETED', updated_at = ? WHERE id = ?",
            [now, task_id]
        )

        # Update owner's capacity state
        state = await WorkforceStateManager.get_employee_state(task["owner"])
        await WorkforceStateManager.update_employee_state(
            employee_id=task["owner"],
            stress_level=max(0.0, state["stress_level"] - 5.0),
            capacity=min(100.0, state["capacity"] + 10.0),
            active_tasks=max(0, state["active_tasks"] - 1)
        )

        await event_bus.emit("TaskCompleted", payload={
            "task_id": task_id,
            "owner": task["owner"],
            "parent_id": task["parent_id"],
            "trigger_experience": trigger_experience
        })

        # Check if parent task can be completed
        if task["parent_id"]:
            await WorkforceDelegationEngine._check_parent_completion(task["parent_id"])

    @staticmethod
    async def _check_parent_completion(parent_id: str) -> None:
        """If all children of a parent are complete, we could auto-complete the parent or notify the reviewer."""
        children = await WorkforceDelegationEngine.get_child_tasks(parent_id)
        if all(child["status"] == "COMPLETED" for child in children):
            # Could auto-complete or notify reviewer here.
            pass
