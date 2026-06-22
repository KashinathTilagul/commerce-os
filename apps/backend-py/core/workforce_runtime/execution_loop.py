"""
EKVAAR OS - Workforce Runtime: Execution Loop Framework
"""
import asyncio
from datetime import datetime, timezone
from core.database import db_run, db_get
from core.execution_governance.kill_switch import KillSwitch

class ExecutionLoop:
    @staticmethod
    async def update_state(employee_id: str, state: str, task_id: str = None, reason: str = None) -> None:
        """
        Updates the runtime state machine for a specific employee.
        States: Idle, Planning, Executing, Blocked, Reviewing, Learning, Paused, Suspended, Awaiting Approval
        """
        updated_at = datetime.now(timezone.utc).isoformat()
        
        # Upsert state
        row = await db_get("SELECT id FROM rt_employee_states WHERE employee_id = ?", [employee_id])
        if row:
            await db_run(
                "UPDATE rt_employee_states SET state = ?, current_task_id = ?, block_reason = ?, updated_at = ? WHERE employee_id = ?",
                [state, task_id, reason, updated_at, employee_id]
            )
        else:
            state_id = f"st_{employee_id}"
            await db_run(
                """
                INSERT INTO rt_employee_states (id, employee_id, state, current_task_id, block_reason, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [state_id, employee_id, state, task_id, reason, updated_at]
            )

    @staticmethod
    async def run_employee_loop(employee_id: str) -> None:
        """
        The continuous asynchronous polling loop for a single Digital Employee.
        Check Inbox -> Review Priorities -> Execute Work -> Report -> Update Memory -> Wait
        """
        # In a real deployed version, this runs infinitely.
        # Check Kill Switch
        if await KillSwitch.get_state("EMPLOYEE", employee_id):
            await ExecutionLoop.update_state(employee_id, "PAUSED", reason="Kill Switch Active")
            return

        # Fetch pending tasks (Inbox)
        row = await db_get("SELECT id FROM workforce_tasks WHERE assigned_to = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1", [employee_id])
        
        if not row:
            await ExecutionLoop.update_state(employee_id, "IDLE")
            return
            
        task_id = row["id"]
        
        # We would then pass this to the workload allocator and task runner.
        # But that logic belongs in task_runner.py.
        # For now, we just transition to planning.
        await ExecutionLoop.update_state(employee_id, "PLANNING", task_id=task_id)
