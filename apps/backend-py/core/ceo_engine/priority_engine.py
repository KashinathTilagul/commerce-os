"""
EKVAAR OS - CEO Engine: Priority Engine
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class CEOPriorityEngine:
    @staticmethod
    async def calculate_priority(
        task_id: str,
        strategic_alignment: float,
        impact: float,
        urgency: float,
        risk: float,
        resource_efficiency: float
    ) -> dict:
        """
        Calculate priority score based on Founder's explicit formula.
        Every score must be explainable (no black-box rankings).
        """
        # Linear transparent formula
        final_score = (strategic_alignment * 1.5) + (impact * 1.2) + (urgency * 1.0) - (risk * 0.5) + (resource_efficiency * 1.0)
        
        priority_id = f"prio_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO ceo_priorities 
            (id, task_id, strategic_alignment, impact, urgency, risk, resource_efficiency, final_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [priority_id, task_id, strategic_alignment, impact, urgency, risk, resource_efficiency, final_score, created_at]
        )
        
        return {
            "id": priority_id,
            "task_id": task_id,
            "final_score": round(final_score, 2),
            "explanation": f"Strategic(x1.5): {strategic_alignment}, Impact(x1.2): {impact}, Urgency(x1.0): {urgency}, Risk(x-0.5): {risk}, Efficiency(x1.0): {resource_efficiency}"
        }
