"""
EKVAAR OS - CEO Engine: LLM Provider Abstraction Layer
"""
import asyncio
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class LLMProvider:
    """Abstract interface for LLM providers."""
    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

class MockLLMProvider(LLMProvider):
    """
    Mock provider for building the architecture before connecting a real LLM.
    Returns deterministic structured payloads based on the requested schema.
    """
    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("[MockLLMProvider] Simulating LLM response...")
        await asyncio.sleep(0.5) # Simulate latency
        
        # We look at the requested schema and construct a dummy response.
        # This allows the rest of the CEO Decision Engine to be built and tested.
        if "confidence_score" in schema:
            # It's a decision response
            return {
                "decision_id": "mock_dec_123",
                "objective": "Simulated Objective",
                "options": ["Option A", "Option B"],
                "recommended_option": "Option A",
                "confidence_score": 85, # 70-89: CEO Approval Required
                "risk_score": 20,
                "impact_score": 60,
                "approval_level": "CEO",
                "reasoning": "Mock reasoning based on Founder Digital Twin constraints.",
                "simulation_results": {},
                "requires_founder": False
            }
        
        if "best_case" in schema:
             return {
                 "best_case": "Maximum market capture.",
                 "expected_case": "Moderate growth.",
                 "worst_case": "Regulatory block."
             }
             
        return {}

class LLMProviderManager:
    def __init__(self):
        self.active_provider: LLMProvider = MockLLMProvider()
        
    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Handles rate limits and fallback logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return await self.active_provider.generate_structured(system_prompt, user_prompt, schema)
            except Exception as e:
                logger.error(f"[LLMProviderManager] Error on attempt {attempt+1}: {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)

# Global singleton
llm_manager = LLMProviderManager()
