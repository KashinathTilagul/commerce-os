"""
EKVAAR OS - Intelligence Layer: Cost Controller
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class CostController:
    @staticmethod
    async def log_cost(target_type: str, target_id: str, provider_id: str, tokens_used: int, cost_incurred: float) -> None:
        """
        Records the granular cost of an intelligence operation.
        target_type: 'EMPLOYEE', 'DEPARTMENT', 'OBJECTIVE', 'PROVIDER'
        """
        cost_log_id = f"cst_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO intel_usage_costs (id, target_type, target_id, provider_id, tokens_used, cost_incurred, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [cost_log_id, target_type, target_id, provider_id, tokens_used, cost_incurred, created_at]
        )

    @staticmethod
    async def get_department_cost(department: str) -> float:
        """Returns the total cost incurred by a department."""
        row = await db_get(
            "SELECT SUM(cost_incurred) as total FROM intel_usage_costs WHERE target_type = 'DEPARTMENT' AND target_id = ?",
            [department]
        )
        return row["total"] if row and row["total"] else 0.0
