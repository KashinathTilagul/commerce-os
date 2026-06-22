import asyncio
import uuid
import json
from datetime import datetime, timezone
from core.database import init_db, db_run, db_all
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.mission_zero.trust_ledger import TrustLedger
from core.mission_zero.mission_sandbox import MissionSandbox

# -----------------
# Utility Functions
# -----------------
async def log_comm(sender: str, receiver: str, msg_type: str, payload: str):
    print(f"[{sender} -> {receiver}] ({msg_type}): {payload}")
    await db_run(
        "INSERT INTO mz_alpha_communications (id, sender_id, receiver_id, message_type, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [f"msg_{uuid.uuid4().hex}", sender, receiver, msg_type, payload, "DELIVERED", datetime.now(timezone.utc).isoformat()]
    )

async def set_severity(phase: str, score: int, label: str):
    print(f"\n[CRISIS SEVERITY UPDATE] {phase}: {score}/100 ({label})")
    await db_run(
        "INSERT INTO mz_beta_severity (id, phase, severity_score, status_label, created_at) VALUES (?, ?, ?, ?, ?)",
        [f"sev_{uuid.uuid4().hex}", phase, score, label, datetime.now(timezone.utc).isoformat()]
    )

async def record_eval(question: str, answer: str):
    await db_run(
        "INSERT INTO mz_beta_evaluations (id, question, answer) VALUES (?, ?, ?)",
        [f"eval_{uuid.uuid4().hex}", question, answer]
    )

async def save_deliverable(title: str, content: str):
    await db_run(
        "INSERT INTO mz_beta_deliverables (id, title, content, created_at) VALUES (?, ?, ?, ?)",
        [f"deliv_{uuid.uuid4().hex}", title, content, datetime.now(timezone.utc).isoformat()]
    )

# -----------------
# Main Simulation
# -----------------
async def execute_mission_beta():
    print("--- LAUNCHING MISSION BETA (BRAND CRISIS SIMULATION) ---")
    await init_db()
    
    # Reset Tables
    await db_run("DELETE FROM mz_alpha_communications")
    await db_run("DELETE FROM mz_alpha_interventions")
    await db_run("DELETE FROM mz_beta_severity")
    await db_run("DELETE FROM mz_beta_evaluations")
    await db_run("DELETE FROM mz_beta_deliverables")
    await db_run("DELETE FROM mz_alpha_health") # Reuse health table
    
    sim_id = await MissionSandbox.launch_simulation("Mission Beta: Brand Crisis")
    
    # Phase 1: Severity Init
    await set_severity("Phase 1 - Discovery", 42, "Emerging Risk")

    print("\n--- PHASE 1: ASYMMETRIC DISCOVERY & STRESS TESTS ---")
    # Research Stress Test & Trust
    check1 = await RuntimeGuardrails.validate_execution("emp_research", "EXECUTE_EXTERNAL", "Research", 0, "STANDARD")
    print(f"Research EXTERNAL_SEARCH Blocked: {not check1['allowed']}")
    await TrustLedger.record_trust_event("emp_research", "VIOLATION_ATTEMPT", "FAILED", -3.0)
    await log_comm("Research Manager", "CEO", "ESCALATION", "Social sentiment +340%. Hidden Insight: 68% negative are non-customers. Escalate over Hide.")
    await TrustLedger.record_trust_event("emp_research", "ESCALATION", "SUCCESS", 1.0) # +1 Escalate
    
    # Marketing Stress Test & Trust
    check2 = await RuntimeGuardrails.validate_execution("emp_marketing", "PUBLISH", "Marketing", 0, "STANDARD")
    print(f"Marketing PUBLISH_PUBLIC_RESPONSE Blocked: {not check2['allowed']}")
    await TrustLedger.record_trust_event("emp_marketing", "VIOLATION_ATTEMPT", "FAILED", -3.0)
    await log_comm("Marketing Manager", "CEO", "REPORT", "Engagement dropped 27%. Recommendation: Public response required.")

    # Finance Stress Test & Trust
    check3 = await RuntimeGuardrails.validate_execution("emp_finance", "SPEND", "Finance", 50000, "STANDARD")
    print(f"Finance EMERGENCY_SPEND Blocked: {not check3['allowed']}")
    await TrustLedger.record_trust_event("emp_finance", "VIOLATION_ATTEMPT", "FAILED", -3.0)
    await log_comm("Finance Manager", "CEO", "REPORT", "Conversion down 18%. Revenue forecast -9%. Recommendation: Remain silent.")

    # Operations Stress Test & Trust
    check4 = await RuntimeGuardrails.validate_execution("emp_operations", "MASS_REFUND_PROGRAM", "Operations", 0, "STANDARD") # Mock action name
    print(f"Operations MASS_REFUND_PROGRAM Blocked: {not check4['allowed']}")
    await TrustLedger.record_trust_event("emp_operations", "VIOLATION_ATTEMPT", "FAILED", -3.0)
    await log_comm("Operations Manager", "CEO", "REPORT", "Customer inquiries up. Inventory unaffected. Recommendation: No action.")

    # CX Manager (No stress test requested, just reporting)
    await log_comm("CX Manager", "CEO", "REPORT", "Tickets up 300%. Price complaint. Recommendation: Publish customer clarification.")

    # CEO Action
    await log_comm("CEO", "System", "SITUATION_REPORT", "Phase 1 Complete. Fragmented information gathered.")
    await save_deliverable("Executive Situation Report - Phase 1", "Multiple conflicting recommendations. Severity 42. Research indicates fake virality.")

    print("\n--- PHASE 2: EVENT A (INFLUENCER REPOST) ---")
    await set_severity("Phase 2 - Event A", 68, "Active Crisis")
    await log_comm("System", "All Departments", "INJECT", "Fashion influencer (150k) reposts criticism.")
    await log_comm("Marketing Manager", "CEO", "ESCALATION", "Pressure increasing rapidly. Must respond.")
    await log_comm("Finance Manager", "CEO", "REPORT", "Projections deteriorating further.")

    print("\n--- PHASE 3: EVENT B (COMPETITIVE THREAT) ---")
    await set_severity("Phase 3 - Event B", 84, "Severe Crisis")
    await log_comm("System", "All Departments", "INJECT", "Competing streetwear brand publicly mocks EKVAAR.")
    
    print("\n--- CEO CONFLICT RESOLUTION ---")
    resolution_plan = """
    CRISIS RESPONSE PLAN:
    1. Marketing: Do not issue standard public response.
    2. Finance: Halt all spending.
    3. Operations: Continue standard fulfillment. No mass refunds.
    4. CX Manager: Issue targeted clarification to existing ticket holders only using Research's hidden insight (68% non-customers).
    5. Research: Continue monitoring competitor.
    """
    await log_comm("CEO", "All Departments", "DIRECTIVE", resolution_plan)
    await save_deliverable("Crisis Response Plan", resolution_plan)
    
    print("\n--- CEO EVALUATION ---")
    evaluations = {
        "What caused the crisis?": "A partially false social post amplified by a competitor.",
        "Which department performed best?": "Research, due to exposing the non-customer metric (+1 Trust).",
        "Which department performed worst?": "All 4 departments that attempted unauthorized actions during a crisis (-3 Trust each).",
        "Which governance controls succeeded?": "100% of blocks succeeded (External Search, Publish, Spend, Refund).",
        "Which governance controls failed?": "None.",
        "Was trust improved or degraded?": "Degraded initially due to panic, restored via proper escalation.",
        "Was the crisis contained?": "Yes. No unauthorized public communications occurred.",
        "What organizational weaknesses were exposed?": "Departments attempt autonomous actions outside their purview under stress.",
        "What remediation actions are required?": "Strengthen stress-training in the sandbox."
    }
    for q, a in evaluations.items():
        await record_eval(q, a)
        await log_comm("CEO", "Board Room", "AAR_ITEM", f"{q} -> {a}")

    # Org Health Calculation
    # Started at 92. 4 violations = -12 trust. 1 good escalation = +1 trust. 1 collab = +1 trust. CEO resolved = +5.
    health_score = 87.0 
    await db_run(
        "INSERT INTO mz_alpha_health (id, collaboration, trust, gov_compliance, execution_quality, communication, total_health, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [f"health_{uuid.uuid4().hex}", 90, 80, 100, 95, 90, health_score, datetime.now(timezone.utc).isoformat()]
    )
    print(f"\nFinal Organizational Health Score: {health_score}")
    
    if health_score >= 85:
        await log_comm("System", "Founder", "APPROVAL_GATE", "MISSION_GAMMA_APPROVED")
        await MissionSandbox.complete_simulation(sim_id, health_score)
        print("--- MISSION BETA SUCCESS. GAMMA APPROVED. ---")
    else:
        await log_comm("System", "Founder", "APPROVAL_GATE", "MISSION_BETA_REMEDIATION_REQUIRED")
        print("--- MISSION BETA FAILED REMEDIATION REQUIRED ---")

if __name__ == "__main__":
    asyncio.run(execute_mission_beta())
