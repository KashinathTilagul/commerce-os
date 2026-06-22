"""
EKVAAR OS - Mission Zero: Inbox Scorer
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run

class InboxScorer:
    # Threshold out of 100 to show in the Founder's direct inbox
    VISIBILITY_THRESHOLD = 75.0

    @staticmethod
    async def process_incoming_item(payload: str, impact: float, urgency: float, risk: float, strategic_imp: float) -> dict:
        """
        Calculates total priority score. 
        Items below VISIBILITY_THRESHOLD are hidden from the primary Founder Inbox.
        """
        item_id = f"inbox_{uuid.uuid4().hex}"
        
        # Weighted scoring (Mock logic)
        total_score = (impact * 0.3) + (urgency * 0.3) + (risk * 0.2) + (strategic_imp * 0.2)
        
        is_visible = total_score >= InboxScorer.VISIBILITY_THRESHOLD
        
        await db_run(
            """
            INSERT INTO mz_inbox_items (id, payload, impact, urgency, risk, strategic_imp, total_score, is_visible, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [item_id, payload, impact, urgency, risk, strategic_imp, total_score, 1 if is_visible else 0, datetime.now(timezone.utc).isoformat()]
        )
        
        return {
            "id": item_id,
            "score": total_score,
            "visible": is_visible
        }
