import asyncio
from core.database import init_db, db_all, db_run
from core.ceo_engine.founder_memory.founder_memory_service import FounderMemoryService
from core.ceo_engine.founder_memory.twin_evolution import TwinEvolutionEngine
from core.ceo_engine.founder_memory.pattern_detection import PatternDetectionEngine
from core.ceo_engine.founder_memory.similarity_model import FounderSimilarityModel
from core.ceo_engine.founder_memory.founder_preference_engine import FounderPreferenceEngine

async def run_twin_tests():
    print("--- EKVAAR OS FOUNDER DIGITAL TWIN VERIFICATION ---")
    await init_db()
    
    # Reset state for testing
    await db_run("DELETE FROM founder_memory")
    await db_run("DELETE FROM founder_decisions")
    await db_run("DELETE FROM founder_patterns")
    await db_run("DELETE FROM founder_similarity")
    await db_run("DELETE FROM founder_preferences")

    # TEST 1: Evidence Test
    print("\n[TEST 1] Evidence Accumulation Test")
    dec_id = await TwinEvolutionEngine.capture_behavior(
        situation="Marketing proposes $10k ad spend vs $10k influencer spend.",
        options=["Ad Spend", "Influencer Spend"],
        founder_choice="Option B (Influencer Spend)",
        reason="Organic reach converts better than paid ads for our niche.",
        outcome="EXECUTED"
    )
    decision_record = await db_all("SELECT * FROM founder_decisions WHERE id = ?", [dec_id])
    print(f"Evidence Recorded: Founder Choice = {decision_record[0]['founder_choice']}")
    assert decision_record[0]["founder_choice"] == "Option B (Influencer Spend)"

    # TEST 2: Pattern Test
    print("\n[TEST 2] Pattern Detection Test")
    # Simulate 10 decisions
    for _ in range(10):
        await TwinEvolutionEngine.capture_behavior(
            situation="A complex scaling problem.",
            options=["Simple fix", "Complex architecture"],
            founder_choice="Simple fix",
            reason="Maintainability over perfect scaling."
        )
    patterns = await PatternDetectionEngine.analyze_evidence_for_patterns()
    print(f"Patterns Proposed: {len(patterns)}")
    assert len(patterns) > 0
    
    # Verify it is merely PROPOSED and not automatically accepted
    pattern_record = await db_all("SELECT * FROM founder_patterns WHERE id = ?", [patterns[0]])
    print(f"Pattern Status: {pattern_record[0]['status']}")
    assert pattern_record[0]["status"] == "PROPOSED"

    # TEST 3: Similarity Test
    print("\n[TEST 3] 5-Dimensional Similarity Test")
    sim_id = await FounderSimilarityModel.track_similarity(
        decision_id="dec_123",
        rec_sim=85.0,
        reason_sim=60.0,
        prio_sim=90.0,
        risk_sim=45.0
    )
    sim_record = await db_all("SELECT * FROM founder_similarity WHERE id = ?", [sim_id])
    final_sim = sim_record[0]['final_sim']
    print(f"Stored Similarity Scores: Rec(85.0) Reason(60.0) Prio(90.0) Risk(45.0) -> Final({final_sim})")
    assert sim_record[0]["final_sim"] > 0

    # TEST 4: Preference Test
    print("\n[TEST 4] Preference Detection Test")
    pref_id = await FounderPreferenceEngine.track_preference(
        category="COMMUNICATION",
        preference="Reject lengthy reports, demand 3-bullet summaries.",
        confidence=0.95
    )
    pref_record = await db_all("SELECT * FROM founder_preferences WHERE id = ?", [pref_id])
    print(f"Preference Detected: {pref_record[0]['preference']}")
    assert pref_record[0]["preference"] == "Reject lengthy reports, demand 3-bullet summaries."

    print("\n--- ALL VERIFICATIONS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_twin_tests())
