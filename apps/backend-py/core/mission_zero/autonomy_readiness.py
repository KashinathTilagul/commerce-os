"""
EKVAAR OS - Mission Zero: Autonomy Readiness Index
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class AutonomyReadiness:
    @staticmethod
    async def calculate_index() -> dict:
        """
        Dynamically computes the organization's Autonomy Readiness Index (0-100).
        """
        # In full implementation, this aggregates average scores from mz_executive_scorecards.
        # For mock execution, we retrieve the saved global score or default to 0.
        row = await db_get("SELECT current_score FROM mz_autonomy_readiness WHERE id = 'GLOBAL'")
        score = row["current_score"] if row else 0.0
        
        level = "Simulation Only"
        if score >= 80:
            level = "Autonomous Execution Candidate"
        elif score >= 60:
            level = "Controlled Execution"
        elif score >= 40:
            level = "Shadow Mode"
            
        return {
            "score": score,
            "level": level
        }

    @staticmethod
    async def update_score(new_score: float) -> None:
        """Updates the global autonomy score."""
        now = datetime.now(timezone.utc).isoformat()
        await db_run(
            """
            INSERT INTO mz_autonomy_readiness (id, current_score, updated_at)
            VALUES ('GLOBAL', ?, ?)
            ON CONFLICT(id) DO UPDATE SET current_score = excluded.current_score, updated_at = excluded.updated_at
            """,
            [new_score, now]
        )
