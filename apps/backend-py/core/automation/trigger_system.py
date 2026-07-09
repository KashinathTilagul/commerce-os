"""
EKVAAR OS — Event Trigger System

Hooks into the event bus to automatically trigger workflow execution.
Phase 4: Automation Layer
"""

import asyncio
import logging
from typing import Dict, Any
from core.events.bus import event_bus
from core.events.types import EventType
from core.automation.workflow_engine import workflow_engine, WorkflowTrigger

logger = logging.getLogger(__name__)


async def on_approval_approved(payload: Dict[str, Any]):
    """
    Triggered when an approval is approved.
    Executes workflow chain for approval->execution automation.
    """
    logger.info(f"[TRIGGER] Approval approved: {payload.get('approval_id')}")
    
    approval_id = payload.get("approval_id") or payload.get("id")
    approval_type = payload.get("approval_type", "GENERAL")
    task_id = payload.get("task_id")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.APPROVAL_APPROVED.value,
        payload={
            "approval_id": approval_id,
            "approval_type": approval_type,
            "task_id": task_id,
            "event_type": "approval.approved"
        }
    )


async def on_approval_rejected(payload: Dict[str, Any]):
    """
    Triggered when an approval is rejected.
    """
    logger.info(f"[TRIGGER] Approval rejected: {payload.get('approval_id')}")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.APPROVAL_REJECTED.value,
        payload={
            "approval_id": payload.get("approval_id"),
            "reason": payload.get("reason"),
            "event_type": "approval.rejected"
        }
    )


async def on_task_completed(payload: Dict[str, Any]):
    """
    Triggered when an agent completes a task.
    Checks for dependent tasks and triggers their execution.
    """
    logger.info(f"[TRIGGER] Task completed: {payload.get('task_id')}")
    
    task_id = payload.get("task_id") or payload.get("source_id")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.TASK_COMPLETED.value,
        payload={
            "task_id": task_id,
            "agent_id": payload.get("agent_id"),
            "has_dependents": True,
            "event_type": "task.completed"
        }
    )


async def on_task_failed(payload: Dict[str, Any]):
    """
    Triggered when a task fails.
    Handles retry logic and escalation.
    """
    logger.warning(f"[TRIGGER] Task failed: {payload.get('task_id')}")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.TASK_FAILED.value,
        payload={
            "task_id": payload.get("task_id"),
            "error": payload.get("error"),
            "retry_count": payload.get("retry_count", 0),
            "event_type": "task.failed"
        }
    )


async def on_risk_escalated(payload: Dict[str, Any]):
    """
    Triggered when a critical risk is escalated.
    Creates approval for Founder review if needed.
    """
    logger.critical(f"[TRIGGER] Risk escalated: {payload.get('risk_id')}")
    
    risk_level = payload.get("risk_level", "HIGH")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.RISK_ESCALATED.value,
        payload={
            "risk_id": payload.get("risk_id"),
            "risk_level": risk_level,
            "metric": payload.get("metric"),
            "message": payload.get("message"),
            "event_type": "risk.escalated"
        }
    )


async def on_signal_detected(payload: Dict[str, Any]):
    """
    Triggered when a telemetry signal is detected.
    """
    signal_type = payload.get("signal_type", "ANOMALY")
    severity = payload.get("severity", "WARNING")
    
    logger.info(f"[TRIGGER] Signal detected: {signal_type} ({severity})")
    
    await workflow_engine.process_event(
        event_type=WorkflowTrigger.SIGNAL_DETECTED.value,
        payload={
            "signal_id": payload.get("signal_id"),
            "signal_type": signal_type,
            "severity": severity,
            "metric": payload.get("metric"),
            "event_type": "signal.detected"
        }
    )


def register_triggers():
    """
    Register all event triggers with the event bus.
    Called during application startup.
    """
    event_bus.subscribe(EventType.APPROVAL_APPROVED, on_approval_approved)
    event_bus.subscribe(EventType.APPROVAL_REJECTED, on_approval_rejected)
    event_bus.subscribe(EventType.RUN_COMPLETED, on_task_completed)
    event_bus.subscribe(EventType.RUN_FAILED, on_task_failed)
    event_bus.subscribe(EventType.RISK_ESCALATED, on_risk_escalated)
    event_bus.subscribe(EventType.SIGNAL_DETECTED, on_signal_detected)
    
    logger.info("[Trigger System] All automation triggers registered")


triggers_registered = False


def ensure_triggers_registered():
    global triggers_registered
    if not triggers_registered:
        register_triggers()
        triggers_registered = True
