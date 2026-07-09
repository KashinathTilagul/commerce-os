"""
EKVAAR OS — Event Type Constants

Every system event is typed. This module defines the canonical event types
referenced by the Event Bus, Activity Logs, and Automation Engine.
"""


class EventType:
    """Canonical event types for the EKVAAR OS event ledger."""

    # ── Issue Events ──────────────────────────────────────────────────
    ISSUE_CREATED = "issue.created"
    ISSUE_UPDATED = "issue.updated"
    ISSUE_STATUS_CHANGED = "issue.status_changed"
    ISSUE_ASSIGNED = "issue.assigned"
    ISSUE_PRIORITY_CHANGED = "issue.priority_changed"
    ISSUE_LABEL_CHANGED = "issue.label_changed"
    ISSUE_ARCHIVED = "issue.archived"
    ISSUE_CHECKED_OUT = "issue.checked_out"
    ISSUE_CHECKED_IN = "issue.checked_in"

    # ── Comment Events ────────────────────────────────────────────────
    COMMENT_ADDED = "issue.comment_added"
    MENTION_DETECTED = "issue.mention_detected"

    # ── Run Events ────────────────────────────────────────────────────
    RUN_CREATED = "run.created"
    RUN_STARTED = "run.started"
    RUN_COMPLETED = "run.completed"
    RUN_FAILED = "run.failed"
    RUN_CANCELLED = "run.cancelled"

    # ── Approval Events ───────────────────────────────────────────────
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_APPROVED = "approval.approved"
    APPROVAL_REJECTED = "approval.rejected"
    APPROVAL_REVISION_REQUESTED = "approval.revision_requested"
    APPROVAL_RESUBMITTED = "approval.resubmitted"

    # ── Routine Events ────────────────────────────────────────────────
    ROUTINE_CREATED = "routine.created"
    ROUTINE_FIRED = "routine.fired"
    ROUTINE_PAUSED = "routine.paused"
    ROUTINE_RESUMED = "routine.resumed"

    # ── Budget Events ─────────────────────────────────────────────────
    BUDGET_WARNING = "budget.warning_80"
    BUDGET_BREACHED = "budget.hard_stop_100"
    BUDGET_RESOLVED = "budget.resolved"
    BUDGET_UPDATED = "budget.updated"

    # ── Agent Events ──────────────────────────────────────────────────
    AGENT_HIRED = "agent.hired"
    AGENT_PAUSED = "agent.paused"
    AGENT_RESUMED = "agent.resumed"
    AGENT_TERMINATED = "agent.terminated"

    # ── Knowledge Events ──────────────────────────────────────────────
    KNOWLEDGE_INDEXED = "knowledge.indexed"
    OUTPUT_SUBMITTED = "output.submitted"
    OUTPUT_APPROVED = "output.approved"
    OUTPUT_REJECTED = "output.rejected"

    # ── Governance Events ─────────────────────────────────────────────
    DECISION_LOCKED = "decision.locked"
    METRIC_THRESHOLD_CROSSED = "metric.threshold_crossed"
    
    # ── Telemetry Events ──────────────────────────────────────────────
    TELEMETRY_INGESTED = "telemetry.ingested"
    SIGNAL_DETECTED = "telemetry.signal_detected"
    RISK_IDENTIFIED = "telemetry.risk_identified"
    RISK_ESCALATED = "telemetry.risk_escalated"
    RISK_RESOLVED = "telemetry.risk_resolved"
    
    # ── Escalation Events ─────────────────────────────────────────────
    ESCALATION = "system.escalation"
    ESCALATION_REQUIRED = "escalation.required"
    
    # ── Workflow Events (Phase 4) ─────────────────────────────────────
    WORKFLOW_TRIGGERED = "workflow.triggered"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    STATE_TRANSITION = "state.transition"
