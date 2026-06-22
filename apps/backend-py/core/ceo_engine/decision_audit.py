"""
EKVAAR OS - CEO Engine: Decision Audit Service
"""
import uuid
import json
from datetime import datetime, timezone
from core.database import db_run

class CEODecisionAuditService:
    @staticmethod
    async def log_trace(
        decision_id: str,
        who: str,
        trace_data: dict,
        outcome: str
    ) -> str:
        """
        Creates a 100% reconstructable trace of a decision.
        Tracks: Why, Who, Data Used, Recommendation, Final Outcome.
        """
        audit_id = f"aud_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        trace_json = json.dumps(trace_data)
        
        await db_run(
            """
            INSERT INTO ceo_decision_audits 
            (id, decision_id, trace_data_json, who, outcome, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [audit_id, decision_id, trace_json, who, outcome, created_at]
        )
        
        return audit_id
