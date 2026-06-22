"""
EKVAAR OS - Intelligence Layer: Provider Router
"""
from core.database import db_all
from core.intelligence_layer.provider_registry import ProviderRegistry

class ProviderRouter:
    @staticmethod
    async def select_best_provider(task_complexity: str) -> dict:
        """
        Dynamically selects the optimal provider based on complexity, cost, and historical accuracy.
        task_complexity can be: 'SIMPLE', 'STANDARD', 'COMPLEX', 'STRATEGIC'
        """
        providers = await ProviderRegistry.get_active_providers()
        if not providers:
            return {"status": "ERROR", "reason": "No active providers available."}

        # Simplified logic: 
        # If task is STRATEGIC/COMPLEX, prioritize Highest Accuracy > Reliability.
        # If task is SIMPLE/STANDARD, prioritize Lowest Cost > Latency.
        
        if task_complexity in ["COMPLEX", "STRATEGIC"]:
            # Sort descending by accuracy
            sorted_providers = sorted(providers, key=lambda x: x["accuracy_score"], reverse=True)
        else:
            # Sort ascending by cost
            sorted_providers = sorted(providers, key=lambda x: x["cost_per_1k"])

        best_provider = sorted_providers[0]
        
        return {
            "status": "SUCCESS",
            "provider_id": best_provider["id"],
            "provider_name": best_provider["name"]
        }

    @staticmethod
    async def fallback_provider(failed_provider_id: str) -> dict:
        """
        Returns the next best provider if the primary fails.
        """
        providers = await ProviderRegistry.get_active_providers()
        fallback = [p for p in providers if p["id"] != failed_provider_id]
        if not fallback:
            return {"status": "ERROR", "reason": "No fallback providers available."}
            
        # Just pick the highest reliability fallback
        best_fallback = sorted(fallback, key=lambda x: x["reliability_score"], reverse=True)[0]
        return {
            "status": "SUCCESS",
            "provider_id": best_fallback["id"],
            "provider_name": best_fallback["name"]
        }
