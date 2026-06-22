"""
EKVAAR OS - Execution Governance: Audit Monitor
"""
import uuid
import json
from datetime import datetime, timezone
from core.database import db_run

class AuditMonitor:
    @staticmethod
    async def log_action(action_type: str, actor: str, target: str, trace_data: dict) -> str:
        """
        Records an immutable audit trace of every execution, decision, escalation, delegation, or approval.
        Nothing happens without traceability.
        """
        audit_id = f"adt_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO gov_audit_log (id, action_type, actor, target, trace_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [audit_id, action_type, actor, target, json.dumps(trace_data), created_at]
        )
        
        return audit_id
