"""
EKVAAR OS - Workforce Engine: Metrics Engine
"""
from typing import Dict, Any

from core.database import db_all
from core.workforce_engine.state_manager import WorkforceStateManager

class WorkforceMetricsEngine:
    @staticmethod
    async def get_organizational_health() -> Dict[str, Any]:
        """
        Calculates high-level organizational health based on:
        - Active capacity & stress
        - Escalation volume
        - Pending approvals
        - Knowledge contributions
        """
        # 1. Workforce Health
        active_employees = await WorkforceStateManager.get_all_active_employees()
        total_stress = sum(e["stress_level"] for e in active_employees)
        avg_stress = total_stress / len(active_employees) if active_employees else 0.0
        
        # 2. Escalations
        open_escalations = await db_all("SELECT COUNT(*) as count FROM workforce_escalations WHERE status = 'OPEN'")
        esc_count = open_escalations[0]["count"] if open_escalations else 0

        # 3. Knowledge Contribution
        knowledge_items = await db_all("SELECT COUNT(*) as count FROM workforce_knowledge WHERE status = 'APPROVED'")
        knowledge_count = knowledge_items[0]["count"] if knowledge_items else 0

        # Calculate an arbitrary synthetic score out of 100
        # Formula: Base 100 - (Avg Stress / 2) - (Open Escalations * 5) + (Knowledge Count * 2)
        score = 100.0 - (avg_stress / 2) - (esc_count * 5) + (knowledge_count * 2)
        score = max(0.0, min(100.0, score))

        return {
            "organization_health_score": round(score, 1),
            "average_workforce_stress": round(avg_stress, 1),
            "open_escalations": esc_count,
            "approved_knowledge_assets": knowledge_count,
            "delegation_efficiency": 95.0, # Placeholder
            "collaboration_score": 88.0, # Placeholder
            "decision_quality": 92.0 # Placeholder
        }
