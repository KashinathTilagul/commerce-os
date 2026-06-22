"""
EKVAAR OS - Workforce Engine: Governance Engine (Approvals & Escalations)
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from core.database import db_run, db_get
from core.workforce_engine.event_bus import workforce_event_bus

class WorkforceGovernanceEngine:
    @staticmethod
    async def request_approval(
        task_id: str,
        requester: str,
        approver: str,
        reason: str,
        impact: str,
        risk: str
    ) -> str:
        """Submit a formal approval request in the Governance layer."""
        approval_id = f"app_{uuid.uuid4().hex}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO workforce_approvals 
            (id, task_id, requester, approver, reason, impact, risk, decision, rationale, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [approval_id, task_id, requester, approver, reason, impact, risk, "PENDING", None, timestamp]
        )

        await workforce_event_bus.publish("ApprovalRequested", {
            "approval_id": approval_id,
            "task_id": task_id,
            "requester": requester,
            "approver": approver
        })

        return approval_id

    @staticmethod
    async def resolve_approval(approval_id: str, decision: str, rationale: str = None) -> None:
        """Resolve an approval (APPROVED or REJECTED). Rejections require rationale."""
        if decision == "REJECTED" and not rationale:
            raise ValueError("Rationale is required for REJECTED decisions.")
            
        timestamp = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            "UPDATE workforce_approvals SET decision = ?, rationale = ?, timestamp = ? WHERE id = ?",
            [decision, rationale, timestamp, approval_id]
        )

        approval = await db_get("SELECT * FROM workforce_approvals WHERE id = ?", [approval_id])
        if approval and decision == "APPROVED":
            await workforce_event_bus.publish("ApprovalGranted", {
                "approval_id": approval_id,
                "task_id": approval["task_id"]
            })

    @staticmethod
    async def create_escalation(
        source_id: str,
        level: str,  # LOW, MEDIUM, HIGH, CRITICAL
        reason: str
    ) -> str:
        """Escalate an issue based on severity level."""
        escalation_id = f"esc_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO workforce_escalations 
            (id, source_id, level, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [escalation_id, source_id, level, reason, "OPEN", created_at]
        )

        await workforce_event_bus.publish("EscalationCreated", {
            "escalation_id": escalation_id,
            "level": level,
            "source_id": source_id
        })

        # Routing rules for escalations:
        # HIGH or CRITICAL goes to Founder Inbox (or CEO then Founder)
        if level in ["HIGH", "CRITICAL"]:
            # Here we bridge to the Inbox graph node/task system
            from core.workforce_engine.delegation import WorkforceDelegationEngine
            await WorkforceDelegationEngine.create_task(
                title=f"ESCALATION: {level} Risk",
                description=reason,
                owner="founder",
                reviewer="founder",
                department="Executive",
                priority="P0" if level == "CRITICAL" else "P1",
            )

        return escalation_id
