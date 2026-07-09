"""
EKVAAR OS — Workflow Engine

Implements Phase 4: Automation Layer.
Handles automatic state transitions when approvals complete.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable
from enum import Enum

from core.database import db_run, db_all
from core.events.bus import event_bus
from core.events.types import EventType

logger = logging.getLogger(__name__)


class WorkflowTrigger(Enum):
    APPROVAL_APPROVED = "approval.approved"
    APPROVAL_REJECTED = "approval.rejected"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"
    RISK_ESCALATED = "risk.escalated"
    SIGNAL_DETECTED = "signal.detected"
    METRIC_THRESHOLD = "metric.threshold"


class WorkflowAction(Enum):
    TRANSITION_TASK = "transition_task"
    DISPATCH_AGENT = "dispatch_agent"
    CREATE_APPROVAL = "create_approval"
    SEND_NOTIFICATION = "send_notification"
    UPDATE_METRIC = "update_metric"
    CREATE_TASK = "create_task"
    CHECK_DEPENDENTS = "check_dependents"


class WorkflowRule:
    """Defines a workflow rule: trigger -> actions chain."""
    
    def __init__(
        self,
        name: str,
        trigger: WorkflowTrigger,
        conditions: Dict[str, Any],
        actions: List[Dict[str, Any]],
        enabled: bool = True
    ):
        self.name = name
        self.trigger = trigger
        self.conditions = conditions
        self.actions = actions
        self.enabled = enabled
        self.rule_id = f"rule_{uuid.uuid4().hex[:8]}"


class WorkflowEngine:
    """
    Phase 4 Workflow Engine.
    Automatically executes actions when triggers fire.
    """
    
    DEFAULT_RULES = [
        WorkflowRule(
            name="approval_to_execution",
            trigger=WorkflowTrigger.APPROVAL_APPROVED,
            conditions={"approval_type": "TASK"},
            actions=[
                {"type": "transition_task", "status": "IN_PROGRESS"},
                {"type": "dispatch_agent", "agent_id": "auto"}
            ]
        ),
        WorkflowRule(
            name="task_completed_chain",
            trigger=WorkflowTrigger.TASK_COMPLETED,
            conditions={"has_dependents": True},
            actions=[
                {"type": "check_dependents"},
                {"type": "transition_task", "status": "READY"}
            ]
        ),
        WorkflowRule(
            name="risk_escalation_to_approval",
            trigger=WorkflowTrigger.RISK_ESCALATED,
            conditions={"risk_level": "CRITICAL"},
            actions=[
                {"type": "create_approval", "priority": "CRITICAL"}
            ]
        ),
        WorkflowRule(
            name="agent_failure_retry",
            trigger=WorkflowTrigger.TASK_FAILED,
            conditions={"retry_count": "<3"},
            actions=[
                {"type": "create_task", "status": "PENDING"},
                {"type": "dispatch_agent"}
            ]
        )
    ]
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
    
    def __init__(self):
        self.rules: Dict[str, WorkflowRule] = {}
        self._action_handlers: Dict[WorkflowAction, Callable] = {}
        
        for rule in self.DEFAULT_RULES:
            self.register_rule(rule)
        
        self._register_action_handlers()
    
    def register_rule(self, rule: WorkflowRule):
        self.rules[rule.rule_id] = rule
        logger.info(f"Workflow rule registered: {rule.name} -> {rule.trigger.value}")
    
    def enable_rule(self, rule_id: str):
        if rule_id in self.rules:
            self.rules[rule_id].enabled = True
    
    def disable_rule(self, rule_id: str):
        if rule_id in self.rules:
            self.rules[rule_id].enabled = False
    
    def _register_action_handlers(self):
        self._action_handlers[WorkflowAction.TRANSITION_TASK] = self._handle_transition_task
        self._action_handlers[WorkflowAction.DISPATCH_AGENT] = self._handle_dispatch_agent
        self._action_handlers[WorkflowAction.CREATE_APPROVAL] = self._handle_create_approval
        self._action_handlers[WorkflowAction.CREATE_TASK] = self._handle_create_task
        self._action_handlers[WorkflowAction.CHECK_DEPENDENTS] = self._handle_check_dependents
    
    async def _handle_check_dependents(self, action: Dict[str, Any], payload: Dict[str, Any]):
        """Check for dependent tasks."""
        logger.info("Checking for dependent tasks")
    
    async def process_event(self, event_type: str, payload: Dict[str, Any]):
        """Process an event and execute matching workflow rules."""
        matching_rules = [
            r for r in self.rules.values()
            if r.enabled and r.trigger.value == event_type
        ]
        
        for rule in matching_rules:
            if await self._check_conditions(rule, payload):
                logger.info(f"Executing workflow: {rule.name}")
                await self._execute_actions(rule.actions, payload)
                await self._log_execution(rule, payload)
    
    async def _check_conditions(self, rule: WorkflowRule, payload: Dict[str, Any]) -> bool:
        """Check if rule conditions are met."""
        for key, expected in rule.conditions.items():
            actual = payload.get(key)
            
            if expected == "True" and not actual:
                return False
            if isinstance(expected, str) and expected.startswith("<"):
                try:
                    threshold = int(expected[1:])
                    if not (isinstance(actual, (int, float)) and actual < threshold):
                        return False
                except:
                    return False
            elif actual != expected and not (expected == "auto"):
                pass
        
        return True
    
    async def _execute_actions(self, actions: List[Dict[str, Any]], payload: Dict[str, Any]):
        """Execute a chain of actions."""
        for action_def in actions:
            action_type = action_def.get("type", "")
            action_key = action_type.lower()
            
            handler = None
            for action_enum in WorkflowAction:
                if action_enum.value == action_key:
                    handler = self._action_handlers.get(action_enum)
                    break
            
            if handler:
                try:
                    await handler(action_def, payload)
                except Exception as e:
                    logger.error(f"Workflow action failed: {action_type} - {e}")
    
    async def _handle_transition_task(self, action: Dict[str, Any], payload: Dict[str, Any]):
        """Transition a task to a new status."""
        task_id = payload.get("task_id") or payload.get("id")
        new_status = action.get("status", "IN_PROGRESS")
        
        if not task_id:
            return
        
        await db_run(
            "UPDATE omega_tasks SET status = ? WHERE id = ?",
            [new_status, task_id]
        )
        
        await db_run(
            """
            INSERT INTO workflow_executions (id, rule_name, trigger_type, task_id, action_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
            """,
            [f"exec_{uuid.uuid4().hex[:8]}", "auto", payload.get("event_type", "manual"), task_id, "transition", self._now()]
        )
        
        logger.info(f"Task {task_id} transitioned to {new_status}")
    
    async def _handle_dispatch_agent(self, action: Dict[str, Any], payload: Dict[str, Any]):
        """Dispatch an agent to handle a task."""
        from core.heartbeat.engine import heartbeat_engine
        
        task_id = payload.get("task_id") or payload.get("id")
        agent_id = action.get("agent_id", "default_agent")
        
        if action.get("agent_id") == "auto":
            agent_id = "agent_executor_01"
        
        run_id = await heartbeat_engine.wake(
            agent_id=agent_id,
            trigger_type="workflow"
        )
        
        logger.info(f"Agent {agent_id} dispatched via workflow, run_id={run_id}")
    
    async def _handle_create_approval(self, action: Dict[str, Any], payload: Dict[str, Any]):
        """Create a new approval request."""
        approval_id = f"appr_{uuid.uuid4().hex[:8]}"
        
        await db_run(
            """
            INSERT INTO approval_queue (id, agent_id, action, capability, risk, cost, status, context, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
            """,
            [
                approval_id,
                payload.get("agent_id", "system"),
                payload.get("action", "Auto-generated approval"),
                payload.get("capability", "WORKFLOW"),
                payload.get("risk_level", "MEDIUM"),
                payload.get("cost", 0.0),
                str(payload),
                self._now()
            ]
        )
        
        await event_bus.emit(
            event_type=EventType.APPROVAL_REQUESTED,
            source_type="workflow_engine",
            source_id=approval_id,
            actor_id="system",
            payload={"approval_id": approval_id}
        )
        
        logger.info(f"Approval {approval_id} created via workflow")
    
    async def _handle_create_task(self, action: Dict[str, Any], payload: Dict[str, Any]):
        """Create a new task."""
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        
        await db_run(
            """
            INSERT INTO omega_tasks (id, project_id, title, owner, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                task_id,
                payload.get("project_id"),
                payload.get("title", "Auto-generated task"),
                payload.get("owner", "agent"),
                action.get("status", "PENDING"),
                self._now()
            ]
        )
        
        logger.info(f"Task {task_id} created via workflow")
    
    async def _log_execution(self, rule: WorkflowRule, payload: Dict[str, Any]):
        """Log workflow execution for audit."""
        await db_run(
            """
            INSERT INTO workflow_executions (id, rule_name, trigger_type, task_id, action_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)
            """,
            [
                f"log_{uuid.uuid4().hex[:8]}",
                rule.name,
                rule.trigger.value,
                payload.get("task_id") or payload.get("id"),
                "chain",
                self._now()
            ]
        )


workflow_engine = WorkflowEngine()
