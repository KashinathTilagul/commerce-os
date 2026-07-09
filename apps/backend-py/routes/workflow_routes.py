"""
EKVAAR OS — Workflow API Routes

REST API endpoints for Phase 4 automation layer.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from core.automation.workflow_engine import workflow_engine, WorkflowRule, WorkflowTrigger, WorkflowAction
from core.database import db_all, db_run

router = APIRouter(prefix="/workflow", tags=["Workflow"])


@router.get("/rules")
async def get_rules():
    """Get all workflow rules."""
    rules = []
    for rule_id, rule in workflow_engine.rules.items():
        rules.append({
            "rule_id": rule_id,
            "name": rule.name,
            "trigger": rule.trigger.value,
            "conditions": rule.conditions,
            "actions": rule.actions,
            "enabled": rule.enabled
        })
    return {"rules": rules}


@router.post("/rules")
async def create_rule(
    name: str,
    trigger: str,
    conditions: Dict[str, Any],
    actions: List[Dict[str, Any]]
):
    """Create a new workflow rule."""
    rule = WorkflowRule(
        name=name,
        trigger=WorkflowTrigger(trigger),
        conditions=conditions,
        actions=actions
    )
    workflow_engine.register_rule(rule)
    
    return {"status": "created", "rule_id": rule.rule_id}


@router.post("/rules/{rule_id}/enable")
async def enable_rule(rule_id: str):
    """Enable a workflow rule."""
    workflow_engine.enable_rule(rule_id)
    return {"status": "enabled", "rule_id": rule_id}


@router.post("/rules/{rule_id}/disable")
async def disable_rule(rule_id: str):
    """Disable a workflow rule."""
    workflow_engine.disable_rule(rule_id)
    return {"status": "disabled", "rule_id": rule_id}


@router.get("/executions")
async def get_executions(limit: int = 50):
    """Get recent workflow executions."""
    rows = await db_all(
        """
        SELECT * FROM workflow_executions
        ORDER BY created_at DESC
        LIMIT ?
        """,
        [limit]
    )
    return {"executions": [dict(r) for r in rows]}


@router.post("/trigger")
async def manual_trigger(
    event_type: str,
    payload: Dict[str, Any]
):
    """Manually trigger a workflow event."""
    await workflow_engine.process_event(event_type, payload)
    return {"status": "triggered", "event_type": event_type}


@router.post("/test/approval-chain")
async def test_approval_chain():
    """
    Test the approval -> execution chain.
    Creates a simulated approval approval and triggers the workflow.
    """
    from core.events.bus import event_bus
    from core.events.types import EventType
    
    await event_bus.emit(
        event_type=EventType.APPROVAL_APPROVED,
        source_type="test",
        source_id="test_approval_001",
        actor_id="test",
        payload={
            "approval_id": "test_approval_001",
            "approval_type": "TASK",
            "task_id": "test_task_001"
        }
    )
    
    return {"status": "test_triggered", "message": "Approval chain test executed"}


@router.get("/status")
async def get_workflow_status():
    """Get overall workflow system status."""
    rules_count = len(workflow_engine.rules)
    enabled_count = sum(1 for r in workflow_engine.rules.values() if r.enabled)
    
    recent_executions = await db_all(
        """
        SELECT COUNT(*) as count FROM workflow_executions
        WHERE created_at >= datetime('now', '-1 hour')
        """
    )
    
    return {
        "status": "operational",
        "rules_registered": rules_count,
        "rules_enabled": enabled_count,
        "executions_last_hour": recent_executions[0]["count"] if recent_executions else 0
    }
