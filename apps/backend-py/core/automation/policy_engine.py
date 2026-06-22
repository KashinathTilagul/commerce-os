from typing import Tuple, Optional
from core.database import db_get, db_run
import logging

logger = logging.getLogger(__name__)

class PolicyEngine:
    """
    Evaluates agent requests against capabilities and financial budgets.
    Determines if an action can be AUTO_APPROVED or requires ESCALATION.
    """

    @staticmethod
    async def check_capability(agent_id: str, capability_required: str) -> bool:
        """
        Validates if the agent has been granted the required capability.
        """
        row = await db_get(
            "SELECT id FROM agent_capabilities WHERE agent_id = ? AND capability = ?",
            (agent_id, capability_required)
        )
        return row is not None

    @staticmethod
    async def evaluate_budget(agent_id: str, request_cost: float) -> Tuple[bool, str]:
        """
        Evaluates the financial implication of the action against the agent's budget.
        Returns (is_approved, reason).
        """
        if request_cost <= 0:
            return True, "No cost associated."

        budget = await db_get("SELECT * FROM agent_budgets WHERE agent_id = ?", (agent_id,))
        if not budget:
            return False, "Agent has no budget assigned."

        # Check approval threshold
        if request_cost > budget['approval_threshold']:
            return False, f"Cost ({request_cost}) exceeds approval threshold ({budget['approval_threshold']})."

        # Check daily limit
        new_daily = budget['spend_today'] + request_cost
        if new_daily > budget['daily_budget']:
            return False, f"Daily budget exceeded ({new_daily} > {budget['daily_budget']})."

        return True, "Within budget limits."

    @staticmethod
    async def commit_spend(agent_id: str, amount: float):
        """
        Permanently deducts the amount from the agent's budget tracking after execution.
        """
        if amount <= 0:
            return
            
        await db_run(
            """
            UPDATE agent_budgets 
            SET spend_today = spend_today + ?, spend_month = spend_month + ?
            WHERE agent_id = ?
            """,
            (amount, amount, agent_id)
        )
