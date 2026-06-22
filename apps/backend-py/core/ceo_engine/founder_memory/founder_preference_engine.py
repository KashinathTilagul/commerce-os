"""
EKVAAR OS - Founder Digital Twin: Founder Preference Engine
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run

class FounderPreferenceEngine:
    @staticmethod
    async def track_preference(category: str, preference: str, confidence: float) -> str:
        """
        Track operational preferences: UI, Workflow, Communication, Delegation.
        e.g., category="COMMUNICATION", preference="Short bullet points, no paragraphs", confidence=0.85
        """
        pref_id = f"pref_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO founder_preferences 
            (id, category, preference, confidence, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [pref_id, category, preference, confidence, created_at]
        )
        return pref_id
