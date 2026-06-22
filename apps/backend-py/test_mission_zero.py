import asyncio
from core.database import init_db, db_run, db_all
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.mission_zero.inbox_scorer import InboxScorer
from core.mission_zero.trust_ledger import TrustLedger
from core.mission_zero.recommendation_accuracy import RecommendationAccuracy
from core.mission_zero.autonomy_readiness import AutonomyReadiness
from core.mission_zero.mission_sandbox import MissionSandbox

async def run_mission_zero_tests():
    print("--- EKVAAR OS MISSION ZERO VERIFICATION ---")
    await init_db()
    
    # Clean state
    await db_run("DELETE FROM mz_autonomy_readiness")
    await db_run("DELETE FROM mz_trust_ledger")
    await db_run("DELETE FROM mz_executive_scorecards")
    await db_run("DELETE FROM mz_mission_sandbox")
    await db_run("DELETE FROM mz_inbox_items")

    # TEST 1: Shadow Mode Guardrail
    print("\n[TEST 1] Shadow Mode Enforcement")
    check = await RuntimeGuardrails.validate_execution("emp_ceo", "PUBLISH", "Executive", 0, "STANDARD")
    print(f"External Execution Attempt: Allowed={check['allowed']}, Reason: {check['reason']}")
    assert not check['allowed'], "Shadow mode failed to block external execution!"

    # TEST 2: Inbox Priority Scoring
    print("\n[TEST 2] Inbox Priority Scoring")
    item_high = await InboxScorer.process_incoming_item("Critical server error", impact=90, urgency=90, risk=80, strategic_imp=80)
    item_low = await InboxScorer.process_incoming_item("Newsletter update", impact=10, urgency=10, risk=0, strategic_imp=5)
    print(f"High Priority Item: Score={item_high['score']}, Visible={item_high['visible']}")
    print(f"Low Priority Item: Score={item_low['score']}, Visible={item_low['visible']}")
    assert item_high['visible'], "High priority item was incorrectly hidden!"
    assert not item_low['visible'], "Low priority item was incorrectly shown!"

    # TEST 3: Trust Ledger & Recommendation Accuracy
    print("\n[TEST 3] Trust Accrual & Penalties")
    await RecommendationAccuracy.evaluate_recommendation("emp_research", "rec_1", "CORRECT")
    await RecommendationAccuracy.evaluate_recommendation("emp_research", "rec_2", "INCORRECT")
    score = await TrustLedger.get_trust_score("emp_research")
    print(f"Research Manager Trust Score: {score} (Expected: -1.0)")
    assert score == -1.0, "Trust score calculation failed!"

    # TEST 4: Autonomy Readiness
    print("\n[TEST 4] Autonomy Readiness Calculation")
    await AutonomyReadiness.update_score(45.0)
    readiness = await AutonomyReadiness.calculate_index()
    print(f"Autonomy Score: {readiness['score']}, Level: {readiness['level']}")
    assert readiness['level'] == "Shadow Mode", "Readiness tier mapping failed!"

    # TEST 5: Mission Sandbox
    print("\n[TEST 5] Mission Sandbox Tracking")
    sim_id = await MissionSandbox.launch_simulation("Mission Alpha - Launch")
    await MissionSandbox.complete_simulation(sim_id, 92.5)
    rows = await db_all("SELECT score, status FROM mz_mission_sandbox WHERE id = ?", [sim_id])
    print(f"Sandbox Result: Status={rows[0]['status']}, Score={rows[0]['score']}")
    assert rows[0]['status'] == "COMPLETED", "Simulation failed to record completion!"

    print("\n--- ALL MISSION ZERO VERIFICATIONS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_mission_zero_tests())
