"""
EKVAAR OS — Issue Service

Handles the business logic for Issues, Comments, and Activity logging.
Emits events to the EventBus on state changes.
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import logging

from core.database import db_all, db_run
from core.events.bus import event_bus
from core.events.types import EventType

logger = logging.getLogger(__name__)

class IssueNotFoundError(Exception):
    pass

class IssueService:
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
        
    @staticmethod
    def _generate_identifier(prefix: str = "ISS") -> str:
        # In a real system, you'd use a sequence or auto-incrementing ID. 
        # For V1, we'll use a short hash to keep it simple.
        return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

    async def create_issue(self, title: str, description: str = "", priority: str = "medium", creator_id: str = "system", **kwargs) -> Dict[str, Any]:
        issue_id = f"iss_{uuid.uuid4().hex[:16]}"
        identifier = self._generate_identifier()
        now = self._now()
        
        status = kwargs.get("status", "backlog")
        assignee_id = kwargs.get("assignee_id", None)
        project_id = kwargs.get("project_id", None)
        labels = json.dumps(kwargs.get("labels", []))
        
        await db_run(
            """
            INSERT INTO issues (
                id, identifier, title, description, status, priority, 
                assignee_id, creator_id, project_id, labels, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [issue_id, identifier, title, description, status, priority, 
             assignee_id, creator_id, project_id, labels, now, now]
        )
        
        issue = await self.get_issue(issue_id)
        
        await event_bus.emit(
            event_type=EventType.ISSUE_CREATED,
            source_type="issue",
            source_id=issue_id,
            actor_id=creator_id,
            payload={"issue": issue}
        )
        
        await self._log_activity(issue_id, "created", creator_id, "human" if creator_id != "system" else "system", None, json.dumps(issue))
        
        return issue

    async def get_issue(self, issue_id_or_identifier: str) -> Dict[str, Any]:
        # Try by ID first, then by identifier
        rows = await db_all("SELECT * FROM issues WHERE id = ? OR identifier = ?", [issue_id_or_identifier, issue_id_or_identifier])
        if not rows:
            raise IssueNotFoundError(f"Issue {issue_id_or_identifier} not found")
            
        issue = dict(rows[0])
        # Parse JSON fields
        if issue.get("labels"):
            issue["labels"] = json.loads(issue["labels"])
        return issue
        
    async def list_issues(self, status: Optional[str] = None, assignee_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM issues WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
            
        if assignee_id:
            query += " AND assignee_id = ?"
            params.append(assignee_id)
            
        query += " ORDER BY created_at DESC"
        
        rows = await db_all(query, params)
        issues = []
        for r in rows:
            issue = dict(r)
            if issue.get("labels"):
                issue["labels"] = json.loads(issue["labels"])
            issues.append(issue)
            
        return issues

    async def update_issue(self, issue_id: str, updates: Dict[str, Any], actor_id: str = "system") -> Dict[str, Any]:
        issue = await self.get_issue(issue_id)
        now = self._now()
        
        update_fields = []
        params = []
        
        for key, value in updates.items():
            if key in ["title", "description", "status", "priority", "assignee_id", "project_id"]:
                if issue.get(key) != value:
                    update_fields.append(f"{key} = ?")
                    params.append(value)
                    
                    # Log activity and emit specific events
                    if key == "status":
                        await self._log_activity(issue_id, "status_changed", actor_id, "human", str(issue.get(key)), str(value))
                        await event_bus.emit(EventType.ISSUE_STATUS_CHANGED, "issue", issue_id, actor_id, payload={"old_status": issue.get(key), "new_status": value})
                    elif key == "assignee_id":
                        await self._log_activity(issue_id, "reassigned", actor_id, "human", str(issue.get(key)), str(value))
                        await event_bus.emit(EventType.ISSUE_ASSIGNED, "issue", issue_id, actor_id, payload={"old_assignee": issue.get(key), "new_assignee": value})
                    elif key == "priority":
                        await self._log_activity(issue_id, "priority_changed", actor_id, "human", str(issue.get(key)), str(value))
                        await event_bus.emit(EventType.ISSUE_PRIORITY_CHANGED, "issue", issue_id, actor_id, payload={"old_priority": issue.get(key), "new_priority": value})
                        
            elif key == "labels":
                labels_json = json.dumps(value)
                if issue.get("labels") != value: # simple comparison might fail for lists, but good enough for now
                    update_fields.append("labels = ?")
                    params.append(labels_json)
                    await self._log_activity(issue_id, "label_changed", actor_id, "human", json.dumps(issue.get("labels")), labels_json)
                    await event_bus.emit(EventType.ISSUE_LABEL_CHANGED, "issue", issue_id, actor_id, payload={"old_labels": issue.get("labels"), "new_labels": value})

        if not update_fields:
            return issue

        update_fields.append("updated_at = ?")
        params.append(now)
        params.append(issue_id)

        query = f"UPDATE issues SET {', '.join(update_fields)} WHERE id = ?"
        await db_run(query, params)
        
        updated_issue = await self.get_issue(issue_id)
        
        await event_bus.emit(
            event_type=EventType.ISSUE_UPDATED,
            source_type="issue",
            source_id=issue_id,
            actor_id=actor_id,
            payload={"updates": updates}
        )
        
        return updated_issue
        
    async def checkout_issue(self, issue_id: str, agent_id: str, run_id: str) -> Dict[str, Any]:
        issue = await self.get_issue(issue_id)
        
        if issue.get("checkout_agent_id") and issue.get("checkout_agent_id") != agent_id:
            raise Exception(f"Issue already checked out by agent {issue['checkout_agent_id']}")
            
        now = self._now()
        
        await db_run(
            "UPDATE issues SET checkout_agent_id = ?, checkout_run_id = ?, updated_at = ? WHERE id = ?",
            [agent_id, run_id, now, issue_id]
        )
        
        await self._log_activity(issue_id, "checked_out", agent_id, "agent", None, run_id)
        await event_bus.emit(EventType.ISSUE_CHECKED_OUT, "issue", issue_id, agent_id, "agent", payload={"run_id": run_id})
        
        return await self.get_issue(issue_id)
        
    async def checkin_issue(self, issue_id: str, agent_id: str) -> Dict[str, Any]:
        issue = await self.get_issue(issue_id)
        
        if issue.get("checkout_agent_id") != agent_id:
            logger.warning(f"Agent {agent_id} trying to checkin issue checked out by {issue.get('checkout_agent_id')}")
            
        now = self._now()
        
        await db_run(
            "UPDATE issues SET checkout_agent_id = NULL, checkout_run_id = NULL, updated_at = ? WHERE id = ?",
            [now, issue_id]
        )
        
        await self._log_activity(issue_id, "checked_in", agent_id, "agent", issue.get("checkout_run_id"), None)
        await event_bus.emit(EventType.ISSUE_CHECKED_IN, "issue", issue_id, agent_id, "agent")
        
        return await self.get_issue(issue_id)

    async def add_comment(self, issue_id: str, author_id: str, body: str, author_type: str = "human", run_id: Optional[str] = None) -> Dict[str, Any]:
        await self.get_issue(issue_id) # Ensure issue exists
        
        comment_id = f"cmt_{uuid.uuid4().hex[:16]}"
        now = self._now()
        
        await db_run(
            """
            INSERT INTO issue_comments (id, issue_id, author_id, author_type, body, run_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [comment_id, issue_id, author_id, author_type, body, run_id, now, now]
        )
        
        # Log activity
        await self._log_activity(issue_id, "commented", author_id, author_type, None, comment_id)
        
        # Emit event
        await event_bus.emit(
            event_type=EventType.COMMENT_ADDED,
            source_type="issue",
            source_id=issue_id,
            actor_id=author_id,
            actor_type=author_type,
            payload={"comment_id": comment_id, "body": body}
        )
        
        return {
            "id": comment_id,
            "issue_id": issue_id,
            "author_id": author_id,
            "author_type": author_type,
            "body": body,
            "run_id": run_id,
            "created_at": now,
            "updated_at": now
        }
        
    async def list_comments(self, issue_id: str) -> List[Dict[str, Any]]:
        rows = await db_all("SELECT * FROM issue_comments WHERE issue_id = ? ORDER BY created_at ASC", [issue_id])
        return [dict(r) for r in rows]

    async def _log_activity(self, issue_id: str, event_type: str, actor_id: str, actor_type: str, old_value: Optional[str], new_value: Optional[str]):
        activity_id = f"act_{uuid.uuid4().hex[:16]}"
        now = self._now()
        
        await db_run(
            """
            INSERT INTO issue_activity (id, issue_id, event_type, actor_id, actor_type, old_value, new_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [activity_id, issue_id, event_type, actor_id, actor_type, old_value, new_value, now]
        )

issue_service = IssueService()
