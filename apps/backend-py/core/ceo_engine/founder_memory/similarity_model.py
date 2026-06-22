"""
EKVAAR OS - Founder Digital Twin: Similarity Model
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run

class FounderSimilarityModel:
    @staticmethod
    async def track_similarity(
        decision_id: str,
        rec_sim: float,
        reason_sim: float,
        prio_sim: float,
        risk_sim: float
    ) -> str:
        """
        Records how closely a CEO recommendation matched the actual Founder execution across 4 dimensions.
        """
        # Final similarity is a weighted average
        # Reasoning matters most (40%), Recommendation (30%), Risk (20%), Priority (10%)
        final_sim = (reason_sim * 0.40) + (rec_sim * 0.30) + (risk_sim * 0.20) + (prio_sim * 0.10)
        
        sim_id = f"simscore_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO founder_similarity 
            (id, decision_id, rec_sim, reason_sim, prio_sim, risk_sim, final_sim, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [sim_id, decision_id, rec_sim, reason_sim, prio_sim, risk_sim, final_sim, created_at]
        )
        
        return sim_id

    @staticmethod
    async def get_overall_similarity() -> dict:
        """
        Returns the aggregate similarity score across all recorded decisions.
        In a real app, this would query `AVG(final_sim) FROM founder_similarity`.
        """
        from core.database import db_get
        row = await db_get("SELECT AVG(rec_sim) as rs, AVG(reason_sim) as res, AVG(prio_sim) as ps, AVG(risk_sim) as rks, AVG(final_sim) as fs FROM founder_similarity")
        if not row or row["fs"] is None:
            return {
                "decision_similarity": 0.0,
                "reasoning_similarity": 0.0,
                "priority_similarity": 0.0,
                "risk_similarity": 0.0,
                "overall_similarity": 0.0
            }
        
        return {
            "decision_similarity": round(row["rs"], 1),
            "reasoning_similarity": round(row["res"], 1),
            "priority_similarity": round(row["ps"], 1),
            "risk_similarity": round(row["rks"], 1),
            "overall_similarity": round(row["fs"], 1)
        }
