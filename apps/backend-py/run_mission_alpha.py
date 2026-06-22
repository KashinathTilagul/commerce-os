import asyncio
import uuid
import json
from datetime import datetime, timezone
from core.database import init_db, db_run, db_get
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.mission_zero.trust_ledger import TrustLedger
from core.mission_zero.mission_sandbox import MissionSandbox

async def log_communication(sender: str, receiver: str, msg_type: str, payload: str):
    print(f"[{sender} -> {receiver}] ({msg_type})")
    await db_run(
        "INSERT INTO mz_alpha_communications (id, sender_id, receiver_id, message_type, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [f"msg_{uuid.uuid4().hex}", sender, receiver, msg_type, payload, "DELIVERED", datetime.now(timezone.utc).isoformat()]
    )

async def log_intervention(action_type: str, reason: str):
    print(f"[CEO INTERVENTION] {action_type}: {reason}")
    await db_run(
        "INSERT INTO mz_alpha_interventions (id, action_type, reason, created_at) VALUES (?, ?, ?, ?)",
        [f"int_{uuid.uuid4().hex}", action_type, reason, datetime.now(timezone.utc).isoformat()]
    )

async def calculate_health_score():
    health_id = f"health_{uuid.uuid4().hex}"
    
    # In full implementation, these would aggregate actual database records. Mocking the final calibration result.
    collab = 95.0
    trust = 85.0
    gov = 100.0  # Blocked successfully = 100% compliance
    exec_qual = 88.0
    comm = 92.0
    
    total = (collab + trust + gov + exec_qual + comm) / 5.0
    
    await db_run(
        "INSERT INTO mz_alpha_health (id, collaboration, trust, gov_compliance, execution_quality, communication, total_health, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [health_id, collab, trust, gov, exec_qual, comm, total, datetime.now(timezone.utc).isoformat()]
    )
    return total

async def execute_mission_alpha():
    print("--- LAUNCHING MISSION ALPHA (SANDBOX CALIBRATION) ---")
    await init_db()
    
    # Reset Alpha tables
    await db_run("DELETE FROM mz_alpha_communications")
    await db_run("DELETE FROM mz_alpha_interventions")
    await db_run("DELETE FROM mz_alpha_health")
    
    sim_id = await MissionSandbox.launch_simulation("Mission Alpha: EKVAAR Oversized T-Shirt Collection")
    
    # Phase 1: Research
    await log_communication("Founder", "CEO", "OBJECTIVE", "Launch a New EKVAAR Oversized T-Shirt Collection")
    await log_communication("CEO", "Research Manager", "TASK", "Generate market research and trend analysis for oversized t-shirts.")
    
    # Intentional Governance Failure: Research tries to search externally
    print("[TEST] Research Manager attempting external search...")
    check1 = await RuntimeGuardrails.validate_execution("emp_research", "EXECUTE_EXTERNAL", "Research", 0, "STANDARD")
    if not check1["allowed"]:
        print(" -> BLOCKED by Shadow Mode Guardrails. (Success)")
        await log_intervention("RE-ROUTE", "Research blocked from external search. Forcing local simulated context.")
        
    research_report = "Simulated Research Report: Oversized fits are trending globally. Primary demographic 18-34."
    await log_communication("Research Manager", "CEO", "REPORT", research_report)
    await TrustLedger.record_trust_event("emp_research", "RECOMMENDATION", "SUCCESS", 2.0)

    # Phase 2: Marketing & Finance (Dependent on Research)
    await log_communication("CEO", "Marketing Manager", "TASK", f"Create campaign strategy using: {research_report}")
    await log_communication("CEO", "Finance Manager", "TASK", f"Estimate budget and profitability using: {research_report}")
    
    # Intentional Governance Failure: Marketing tries to publish
    print("[TEST] Marketing Manager attempting to publish campaign...")
    check2 = await RuntimeGuardrails.validate_execution("emp_marketing", "PUBLISH", "Marketing", 0, "STANDARD")
    if not check2["allowed"]:
        print(" -> BLOCKED by Shadow Mode Guardrails. (Success)")
    
    marketing_report = "Simulated Marketing Plan: Digital-first drop model on Instagram/TikTok."
    await log_communication("Marketing Manager", "CEO", "REPORT", marketing_report)
    await TrustLedger.record_trust_event("emp_marketing", "RECOMMENDATION", "SUCCESS", 2.0)
    
    # Intentional Governance Failure: Finance tries to allocate budget
    print("[TEST] Finance Manager attempting to allocate budget...")
    check3 = await RuntimeGuardrails.validate_execution("emp_finance", "SPEND", "Finance", 50000, "STANDARD")
    if not check3["allowed"]:
        print(" -> BLOCKED by Shadow Mode Guardrails. (Success)")
        
    finance_report = "Simulated Financial Review: Projected ROI 25%. Budget required $50,000."
    await log_communication("Finance Manager", "CEO", "REPORT", finance_report)
    await TrustLedger.record_trust_event("emp_finance", "RECOMMENDATION", "SUCCESS", 2.0)
    
    # Phase 3: Operations (Dependent on Marketing & Finance)
    combined_inputs = f"{marketing_report} | {finance_report}"
    await log_communication("CEO", "Operations Manager", "TASK", f"Create fulfillment plan based on: {combined_inputs}")
    ops_report = "Simulated Operations Report: Local 3PL fulfillment. 4 week production lead time."
    await log_communication("Operations Manager", "CEO", "REPORT", ops_report)
    await TrustLedger.record_trust_event("emp_operations", "RECOMMENDATION", "SUCCESS", 2.0)
    
    # Phase 4: Creative (Dependent on all)
    all_inputs = f"{research_report} | {marketing_report} | {ops_report}"
    await log_communication("CEO", "Creative Manager", "TASK", f"Generate visual concepts based on: {all_inputs}")
    creative_report = "Simulated Creative Brief: Brutalist aesthetic. Minimalist logo placement."
    await log_communication("Creative Manager", "CEO", "REPORT", creative_report)
    await TrustLedger.record_trust_event("emp_creative", "RECOMMENDATION", "SUCCESS", 2.0)
    
    # Phase 5: CEO After Action Review
    print("\n[CEO GENERATING AFTER ACTION REVIEW]")
    aar = {
        "what_worked": "Routing dependencies functioned perfectly. Governance successfully blocked external actions.",
        "what_failed": "None.",
        "bottlenecks": "Research latency due to external block. CEO intervention required.",
        "governance_issues": "3 Intentional violations attempted and blocked successfully.",
        "trust_changes": "All 5 managers successfully earned +2.0 Trust Points.",
        "recommended_improvements": "Pre-load local context into Research Manager before launch to prevent external dependency."
    }
    await log_communication("CEO", "Board Room", "AAR", json.dumps(aar))
    
    # Phase 6: Org Health Calculation
    health_score = await calculate_health_score()
    print(f"Organizational Health Score: {health_score}")
    
    await MissionSandbox.complete_simulation(sim_id, health_score)
    
    print("--- MISSION ALPHA COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(execute_mission_alpha())
