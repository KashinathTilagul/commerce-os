import asyncio
from core.database import init_db, db_run, db_all
from core.execution_governance.kill_switch import KillSwitch
from core.execution_governance.budget_controller import BudgetController
from core.execution_governance.execution_permissions import ExecutionPermissions
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.execution_governance.audit_monitor import AuditMonitor
from core.workforce_runtime.execution_loop import ExecutionLoop

async def run_governance_tests():
    print("--- EKVAAR OS EXECUTION GOVERNANCE VERIFICATION ---")
    await init_db()
    
    # Reset state
    await db_run("DELETE FROM gov_budgets")
    await db_run("DELETE FROM gov_permissions")
    await db_run("DELETE FROM gov_kill_switch")
    await db_run("DELETE FROM gov_audit_log")
    await db_run("DELETE FROM rt_employee_states")
    
    employee_id = "emp_research_mgr"
    department = "RESEARCH"

    # TEST 1: Budget Test
    print("\n[TEST 1] Budget Enforcement Test")
    await BudgetController.initialize_department_budget(department, limit=100.0)
    has_budget = await BudgetController.check_budget(department, 150.0)
    print(f"Department budget exceeds requested cost. Allowed? {has_budget}")
    assert has_budget == False, "Budget limits are not enforced!"
    
    # TEST 2: Permission Test
    print("\n[TEST 2] Permission Enforcement Test")
    await ExecutionPermissions.initialize_employee(employee_id)
    # Default is read-only (Execute = 0)
    can_exec = await ExecutionPermissions.check_permission(employee_id, "EXECUTE")
    print(f"Research Manager attempting EXECUTE action. Allowed? {can_exec}")
    assert can_exec == False, "Default execution permissions are not Read-Only!"

    # TEST 3: Governance Guardrails Test (High Risk)
    print("\n[TEST 3] Governance Guardrails High-Risk Test")
    await ExecutionPermissions.grant_permission(employee_id, "can_execute")
    guardrail_res = await RuntimeGuardrails.validate_execution(
        employee_id=employee_id,
        action="EXECUTE",
        department=department,
        estimated_cost=50.0,
        risk_level="CRITICAL"
    )
    print(f"Guardrail Check on Critical Task: {guardrail_res['reason']}")
    assert guardrail_res["allowed"] == False, "Critical task bypassed Founder Approval!"

    # TEST 4: Kill Switch Test
    print("\n[TEST 4] Emergency Kill Switch Test")
    await KillSwitch.emergency_stop()
    is_paused = await KillSwitch.get_state("GLOBAL")
    print(f"Is Workforce Paused? {is_paused}")
    assert is_paused == True
    
    # Attempting to run employee loop while paused
    await ExecutionLoop.run_employee_loop(employee_id)
    state_record = await db_all("SELECT state, block_reason FROM rt_employee_states WHERE employee_id = ?", [employee_id])
    print(f"Employee State after trying to run during pause: {state_record[0]['state']} ({state_record[0]['block_reason']})")
    assert state_record[0]["state"] == "PAUSED", "Employee executed while Global Kill Switch was active!"

    # TEST 5: Audit Test
    print("\n[TEST 5] Immutable Audit Trace Test")
    audit_id = await AuditMonitor.log_action("TASK_DENIED", employee_id, "task_123", {"reason": "Kill Switch Active"})
    log_record = await db_all("SELECT * FROM gov_audit_log WHERE id = ?", [audit_id])
    assert len(log_record) == 1
    print(f"Audit log recorded successfully. Action: {log_record[0]['action_type']}")

    print("\n--- ALL VERIFICATIONS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_governance_tests())
