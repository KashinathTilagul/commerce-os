import asyncio
from core.database import init_db, db_all, db_run
from core.workforce_engine.routing import WorkforceRouter
from core.workforce_engine.delegation import WorkforceDelegationEngine
from core.workforce_engine.governance import WorkforceGovernanceEngine
from core.workforce_engine.exchange import WorkforceExchangeEngine
from core.workforce_engine.state_manager import WorkforceStateManager
from core.workforce_engine.memory_service import OrganizationalMemoryService

async def run_tests():
    print("--- EKVAAR OS WORKFORCE ENGINE VERIFICATION ---")
    await init_db()
    
    # Reset some state for testing
    await db_run("DELETE FROM workforce_messages")
    await db_run("DELETE FROM workforce_tasks")
    await db_run("DELETE FROM workforce_approvals")
    await db_run("DELETE FROM workforce_escalations")
    await db_run("DELETE FROM workforce_experiences")
    await db_run("DELETE FROM workforce_knowledge")
    await db_run("DELETE FROM workforce_memory")
    await db_run("DELETE FROM workforce_health")

    # TEST 1: Communication Test (Marketing -> Engine -> Legal)
    print("\n[TEST 1] Communication Routing")
    msg_id = await WorkforceRouter.send_message(
        sender="marketing_manager",
        receiver="legal_manager",
        content="Requesting review of campaign copy for GDPR compliance.",
        priority="HIGH"
    )
    msg = await WorkforceRouter.get_message(msg_id)
    print(f"Message Routed: {msg['sender']} -> {msg['receiver']} [Status: {msg['status']}]")
    assert msg["receiver"] == "legal_manager", "Routing Failed"

    # TEST 2: Delegation Test (CEO -> Operations -> Technology)
    print("\n[TEST 2] Delegation Chain Integrity")
    task_ceo = await WorkforceDelegationEngine.create_task(
        title="Deploy Q3 Operational Strategy",
        description="Execute full Q3 plan.",
        owner="operations_manager",
        reviewer="ceo",
        department="Operations"
    )
    task_tech = await WorkforceDelegationEngine.create_task(
        title="Provision Q3 Infrastructure",
        description="Setup servers for Q3 ops.",
        owner="technology_manager",
        reviewer="operations_manager",
        department="Technology",
        parent_id=task_ceo
    )
    children = await WorkforceDelegationEngine.get_child_tasks(task_ceo)
    print(f"Parent Task {task_ceo} has {len(children)} children. Child Owner: {children[0]['owner']}")
    assert children[0]["owner"] == "technology_manager", "Delegation Nesting Failed"
    
    # Complete Child Task
    await WorkforceDelegationEngine.complete_task(task_tech)
    tech_task_state = await WorkforceDelegationEngine.get_task(task_tech)
    print(f"Child Task Status: {tech_task_state['status']}")
    assert tech_task_state["status"] == "COMPLETED"

    # TEST 3: Escalation Test (High Risk -> Founder)
    print("\n[TEST 3] Escalation Routing")
    esc_id = await WorkforceGovernanceEngine.create_escalation(
        source_id="fin_ops_1",
        level="HIGH",
        reason="Vendor breached contract, $500k exposure."
    )
    # The engine should have automatically spawned a P1 Task for the Founder Inbox
    founder_tasks = await db_all("SELECT * FROM workforce_tasks WHERE owner = 'founder' AND title LIKE '%ESCALATION%'")
    print(f"Escalations routed to Founder Inbox: {len(founder_tasks)}")
    assert len(founder_tasks) > 0, "Escalation to Founder failed"

    # TEST 4: Knowledge Workflow Test
    print("\n[TEST 4] Knowledge Pipeline Workflow")
    exp_id = await WorkforceExchangeEngine.generate_experience(
        task_id="some_marketing_task",
        employee_id="marketing_manager",
        content="Found that a 200ms faster load time increased CTR by 5%."
    )
    print(f"Experience Generated: {exp_id}")
    
    # HR proposes knowledge
    know_id = await WorkforceExchangeEngine.propose_knowledge(
        title="Performance vs CTR Correlation",
        content="200ms = 5% CTR boost.",
        author="hr_manager",
        source_experience_id=exp_id
    )
    print(f"Knowledge Proposed (Pending CEO): {know_id}")

    # CEO Approves
    await WorkforceExchangeEngine.approve_knowledge(know_id, "APPROVED")
    
    # Give event bus a tiny window to fire async memory storage
    await asyncio.sleep(0.5)

    # Verify memory
    memories = await db_all("SELECT * FROM workforce_memory WHERE type = 'KNOWLEDGE'")
    print(f"Approved Knowledge in Organizational Memory: {len(memories)}")
    assert len(memories) > 0, "Knowledge not persisted to memory after approval"

    # TEST 5: Capacity Load Balancing Test
    print("\n[TEST 5] Workforce State & Capacity Routing")
    await WorkforceStateManager.update_employee_state("technology_manager", stress_level=95.0, capacity=5.0, active_tasks=20)
    
    msg_id2 = await WorkforceRouter.send_message(
        sender="ceo",
        receiver="technology_manager",
        content="Urgent deployment required."
    )
    msg2 = await WorkforceRouter.get_message(msg_id2)
    print(f"Message Status for Highly Stressed Employee: {msg2['status']}")
    assert msg2["status"] == "QUEUED_DUE_TO_LOAD", "Load balancing ignored stress levels"

    print("\n--- ALL VERIFICATIONS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
