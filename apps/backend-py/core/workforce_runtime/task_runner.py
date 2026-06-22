"""
EKVAAR OS - Workforce Runtime: Task Runner Architecture
"""
import asyncio
from core.database import db_run
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.workforce_runtime.execution_loop import ExecutionLoop

class TaskRunner:
    @staticmethod
    async def execute_task(employee_id: str, department: str, task_id: str, action: str, cost: float, risk: str) -> dict:
        """
        The deterministic harness that executes a task.
        Must pass through Governance Guardrails first.
        """
        await ExecutionLoop.update_state(employee_id, "AWAITING_APPROVAL", task_id=task_id)
        
        # 1. Governance Guardrails Check
        guardrail_check = await RuntimeGuardrails.validate_execution(
            employee_id=employee_id,
            action=action,
            department=department,
            estimated_cost=cost,
            risk_level=risk
        )
        
        if not guardrail_check["allowed"]:
            await ExecutionLoop.update_state(employee_id, "BLOCKED", task_id=task_id, reason=guardrail_check["reason"])
            return {"status": "FAILED", "reason": guardrail_check["reason"]}

        # 2. Transition to Executing
        await ExecutionLoop.update_state(employee_id, "EXECUTING", task_id=task_id)
        
        # 3. Simulate work (since we are in Phase 1 / Phase 2 architecture)
        # No live intelligence injection yet.
        await asyncio.sleep(0.5) 
        
        # 4. Mark Task Complete
        await db_run("UPDATE workforce_tasks SET status = 'COMPLETED' WHERE id = ?", [task_id])
        
        # 5. Return to IDLE
        await ExecutionLoop.update_state(employee_id, "IDLE")
        
        return {"status": "SUCCESS", "reason": "Task executed successfully within governance constraints."}
