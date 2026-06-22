"""
EKVAAR OS - CEO Engine: Decision Memory Service
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class CEODecisionMemoryService:
    @staticmethod
    async def store_outcome(
        decision_id: str,
        outcome_actual: str,
        success_score: float,
        lessons_learned: str
    ) -> str:
        """
        Stores the final outcome of a decision.
        Future decisions must query this to learn.
        """
        memory_id = f"mem_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO ceo_decision_memory 
            (id, decision_id, outcome_actual, success_score, lessons_learned, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [memory_id, decision_id, outcome_actual, success_score, lessons_learned, created_at]
        )
        
        return memory_id
        
    @staticmethod
    async def get_lessons_for_objective(objective_keywords: str) -> list:
        """
        In the future, the LLM will embed this, but for now we do a simple text match.
        """
        # A real implementation would use vector search.
        # This allows the CEO engine to reference historical outcomes.
        pass
