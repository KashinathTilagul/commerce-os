import asyncio
from core.database import init_db, db_run, db_all
from core.intelligence_layer.provider_registry import ProviderRegistry
from core.intelligence_layer.provider_router import ProviderRouter
from core.intelligence_layer.capability_registry import CapabilityRegistry
from core.intelligence_layer.context_engine import ContextEngine
from core.intelligence_layer.prompt_assembly import PromptAssemblyEngine
from core.intelligence_layer.intelligence_cache import IntelligenceCache
from core.intelligence_layer.response_evaluator import ResponseEvaluator

async def run_intelligence_tests():
    print("--- EKVAAR OS INTELLIGENCE LAYER VERIFICATION ---")
    await init_db()
    
    # Clean state
    await db_run("DELETE FROM intel_providers")
    await db_run("DELETE FROM intel_cache")
    await db_run("DELETE FROM intel_evaluations")
    await db_run("DELETE FROM intel_knowledge_queue")

    # Seed Mock Providers
    prov_cheap = await ProviderRegistry.register_provider("Mock Cheap", "mock-mini", cost_per_1k=0.01, latency_ms=100, reliability_score=0.99, accuracy_score=0.85)
    prov_smart = await ProviderRegistry.register_provider("Mock Smart", "mock-pro", cost_per_1k=0.05, latency_ms=500, reliability_score=0.98, accuracy_score=0.99)

    # TEST 1: Capability Abstraction & Routing
    print("\n[TEST 1] Capability Abstraction Test")
    # A research task is simple/standard, should route to cheap
    complexity1 = CapabilityRegistry.map_capability_to_complexity("Research")
    best1 = await ProviderRouter.select_best_provider(complexity1)
    print(f"Research (Complexity: {complexity1}) routed to: {best1['provider_name']}")
    assert best1['provider_name'] == "Mock Cheap", "Failed to route to cheap provider!"

    # A planning task is complex, should route to smart
    complexity2 = CapabilityRegistry.map_capability_to_complexity("Planning")
    best2 = await ProviderRouter.select_best_provider(complexity2)
    print(f"Planning (Complexity: {complexity2}) routed to: {best2['provider_name']}")
    assert best2['provider_name'] == "Mock Smart", "Failed to route to smart/accurate provider!"

    # TEST 2: Context Assembly Test
    print("\n[TEST 2] Context Assembly Test")
    prompt = await PromptAssemblyEngine.build_prompt("emp_ceo", "Analyze the new AI models.")
    print("Generated Prompt Preview:")
    print(prompt[:150] + "...")
    assert "[FOUNDER CONTEXT]" in prompt
    assert "[RELEVANT KNOWLEDGE]" in prompt

    # TEST 3: Cache Hit Test
    print("\n[TEST 3] Intelligence Cache Test")
    await IntelligenceCache.cache_response("Research", "What is the capital of France?", "Paris")
    cached_resp = await IntelligenceCache.get_cached_response("Research", "What is the capital of France?")
    print(f"Cached Response: {cached_resp}")
    assert cached_resp == "Paris", "Cache failed to retrieve identical query!"
    
    # TEST 4: Memory Protection Test
    print("\n[TEST 4] Memory Protection (Knowledge Vault) Test")
    raw_ai_output = "The capital of France is Paris."
    eval_scores = await ResponseEvaluator.evaluate_output(raw_ai_output)
    print(f"Evaluator scores: {eval_scores}")
    
    queue_id = await ResponseEvaluator.route_to_knowledge_queue(raw_ai_output, "Research_Capability")
    rows = await db_all("SELECT status FROM intel_knowledge_queue WHERE id = ?", [queue_id])
    print(f"Item sent to Knowledge Vault queue. Status: {rows[0]['status']}")
    assert rows[0]['status'] == "PENDING_REVIEW", "AI output bypassed human review!"

    print("\n--- ALL INTELLIGENCE VERIFICATIONS PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_intelligence_tests())
