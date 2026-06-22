"""
EKVAAR OS - Execution Governance: Budget Controller
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get, db_all

class BudgetController:
    @staticmethod
    async def initialize_department_budget(department: str, limit: float = 100.0) -> None:
        """Sets an initial budget limit for a department."""
        budget_id = f"bdgt_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        await db_run(
            """
            INSERT INTO gov_budgets (id, department, api_usage, compute_usage, budget_limit, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [budget_id, department, 0.0, 0.0, limit, "ACTIVE", created_at]
        )

    @staticmethod
    async def check_budget(department: str, estimated_cost: float) -> bool:
        """
        Checks if a department has enough remaining budget to execute a task.
        """
        row = await db_get("SELECT api_usage, budget_limit, status FROM gov_budgets WHERE department = ? AND status = 'ACTIVE'", [department])
        if not row:
            # If no budget exists, we default to deny in a governance-first system.
            return False
            
        return (row["api_usage"] + estimated_cost) <= row["budget_limit"]

    @staticmethod
    async def consume_budget(department: str, cost: float) -> None:
        """Deducts budget post-execution."""
        await db_run(
            "UPDATE gov_budgets SET api_usage = api_usage + ? WHERE department = ? AND status = 'ACTIVE'",
            [cost, department]
        )
