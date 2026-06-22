"""
EKVAAR OS - Workforce Engine: State Manager
"""
from typing import Dict, Any, List
from core.database import db_all, db_run

class WorkforceStateManager:
    @staticmethod
    async def get_employee_state(employee_id: str) -> Dict[str, Any]:
        """Fetch the current health and capacity state of an employee."""
        rows = await db_all(
            "SELECT * FROM workforce_health WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1",
            [employee_id]
        )
        if not rows:
            # Default state if not yet recorded
            return {
                "employee_id": employee_id,
                "stress_level": 0.0,
                "capacity": 100.0,
                "active_tasks": 0,
            }
        return rows[0]

    @staticmethod
    async def update_employee_state(employee_id: str, stress_level: float, capacity: float, active_tasks: int) -> int:
        """Update the health and capacity state of an employee."""
        from datetime import datetime, timezone
        timestamp = datetime.now(timezone.utc).isoformat()
        import uuid
        record_id = f"health_{uuid.uuid4().hex[:8]}"
        
        return await db_run(
            """
            INSERT INTO workforce_health (id, employee_id, stress_level, capacity, active_tasks, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [record_id, employee_id, stress_level, capacity, active_tasks, timestamp]
        )

    @staticmethod
    async def can_accept_work(employee_id: str) -> bool:
        """Consults the state to determine if the employee can accept work."""
        state = await WorkforceStateManager.get_employee_state(employee_id)
        # For example, if stress > 90% or capacity < 10%
        if state["stress_level"] > 90.0 or state["capacity"] < 10.0:
            return False
        return True

    @staticmethod
    async def get_all_active_employees() -> List[Dict[str, Any]]:
        """Return the latest state for all active employees."""
        # Using a subquery to get the latest row per employee
        return await db_all(
            """
            SELECT h1.* FROM workforce_health h1
            INNER JOIN (
                SELECT employee_id, MAX(timestamp) as max_ts
                FROM workforce_health
                GROUP BY employee_id
            ) h2 ON h1.employee_id = h2.employee_id AND h1.timestamp = h2.max_ts
            """
        )
