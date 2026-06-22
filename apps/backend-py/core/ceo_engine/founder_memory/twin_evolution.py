"""
EKVAAR OS - Founder Digital Twin: Twin Evolution Engine
"""
from core.ceo_engine.founder_memory.founder_memory_service import FounderMemoryService

class TwinEvolutionEngine:
    @staticmethod
    async def capture_behavior(
        situation: str,
        options: list,
        founder_choice: str,
        reason: str,
        outcome: str = "PENDING"
    ) -> str:
        """
        The primary ingest point for Founder behavior.
        We do NOT generate rules here. We strictly accumulate evidence.
        """
        return await FounderMemoryService.log_decision(
            situation=situation,
            options_presented=options,
            founder_choice=founder_choice,
            reason=reason,
            outcome=outcome
        )

    @staticmethod
    async def check_readiness_for_extraction() -> bool:
        """
        Only after hundreds of examples should rule extraction begin.
        """
        evidence = await FounderMemoryService.get_all_evidence(limit=100)
        return len(evidence) >= 100
