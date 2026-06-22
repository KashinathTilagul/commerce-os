"""
EKVAAR OS - Founder Digital Twin: Pattern Detection Engine
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all

class PatternDetectionEngine:
    @staticmethod
    async def analyze_evidence_for_patterns() -> list:
        """
        Background job that scans `founder_memory` and `founder_decisions`.
        If it finds 10+ repeated decisions/priorities, it proposes a pattern.
        """
        # Mock logic for architecture demonstration.
        # A real implementation would use LLM clustering over the evidence.
        decisions = await db_all("SELECT * FROM founder_decisions")
        
        proposed_patterns = []
        if len(decisions) >= 10:
            # We simulate detecting a pattern
            pattern_id = f"pat_{uuid.uuid4().hex}"
            created_at = datetime.now(timezone.utc).isoformat()
            
            await db_run(
                """
                INSERT INTO founder_patterns 
                (id, pattern_type, description, evidence_count, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [pattern_id, "DECISION_BIAS", "Consistently prefers simpler operational solutions over scalable complex ones.", len(decisions), "PROPOSED", created_at]
            )
            proposed_patterns.append(pattern_id)
            
        return proposed_patterns

    @staticmethod
    async def review_pattern(pattern_id: str, decision: str) -> None:
        """
        Founder reviews the proposed pattern.
        If APPROVED, it becomes a rule in the Twin Evolution Engine.
        """
        status = "APPROVED" if decision == "APPROVED" else "REJECTED"
        await db_run("UPDATE founder_patterns SET status = ? WHERE id = ?", [status, pattern_id])
        
        # In a real system, an APPROVED pattern would automatically trigger an update
        # to the markdown files in `data/founder_profile/`.
