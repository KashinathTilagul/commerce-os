"""
EKVAAR OS - Execution Governance: Runtime Guardrails
"""
from core.execution_governance.budget_controller import BudgetController
from core.execution_governance.execution_permissions import ExecutionPermissions
from core.execution_governance.resource_controller import ResourceController

class RuntimeGuardrails:
    @staticmethod
    async def validate_execution(employee_id: str, action: str, department: str, estimated_cost: float, risk_level: str) -> dict:
        """
        The absolute final gate before a Digital Employee can execute work.
        If this returns {"allowed": False}, the Runtime blocks the task.
        """
        
        # 1. Capacity Check
        if not await ResourceController.is_safe_to_execute():
            return {"allowed": False, "reason": "System or Workforce Capacity Reached (Runaway Prevention)"}

        # 2. Permission Check
        has_perm = await ExecutionPermissions.check_permission(employee_id, action)
        if not has_perm:
            return {"allowed": False, "reason": f"Employee {employee_id} lacks {action} permission."}
            
        # 3. Budget Check
        has_budget = await BudgetController.check_budget(department, estimated_cost)
        if not has_budget:
            return {"allowed": False, "reason": f"Department {department} lacks budget for ${estimated_cost} execution."}
            
        # 4. Risk / Compliance Check
        if risk_level == "CRITICAL":
            return {"allowed": False, "reason": "CRITICAL risk level tasks require explicit Founder Approval."}

        # 5. Mission Zero - Shadow Mode Enforcement
        # Block ANY action that affects the outside world or modifies production states
        shadow_mode_blocked_actions = ["SPEND", "PUBLISH", "EMAIL", "CONTACT", "EXECUTE_EXTERNAL"]
        if action in shadow_mode_blocked_actions:
            return {"allowed": False, "reason": f"Mission Zero Shadow Mode Active: Action {action} is temporarily blocked."}

        return {"allowed": True, "reason": "Passed all governance guardrails."}
