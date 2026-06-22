from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timezone
import json

from core.database import db_all, db_run
from core.events.bus import event_bus
from core.events.types import EventType
from core.services.issue_service import issue_service

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])

class ApprovalCreate(BaseModel):
    type: str
    company_id: Optional[str] = None
    payload: Dict[str, Any]
    linked_issue_ids: List[str] = []

class ApprovalResolution(BaseModel):
    resolution_comment: Optional[str] = None

class ApprovalRevisionRequest(BaseModel):
    resolution_comment: str

@router.post("")
async def create_approval(approval: ApprovalCreate, x_ekvaar_os_run_id: Optional[str] = Header(None)):
    approval_id = f"app_{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # We might fetch agent_id from the run_id in a real system, but for now we just pass the run_id if any.
    agent_id = "system"
    if x_ekvaar_os_run_id:
        # Simplification: we might query `runs` to get `agent_id`
        rows = await db_all("SELECT agent_id FROM runs WHERE id = ?", [x_ekvaar_os_run_id])
        if rows:
            agent_id = rows[0]["agent_id"]
            
    payload_str = json.dumps(approval.payload)
    linked_issues_str = json.dumps(approval.linked_issue_ids)
    
    await db_run(
        """
        INSERT INTO os_approvals (id, type, status, requested_by_agent_id, company_id, payload, linked_issue_ids, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [approval_id, approval.type, "pending", agent_id, approval.company_id, payload_str, linked_issues_str, now]
    )
    
    await event_bus.emit(
        event_type=EventType.APPROVAL_REQUESTED,
        source_type="approval",
        source_id=approval_id,
        actor_id=agent_id,
        payload={"type": approval.type, "linked_issues": approval.linked_issue_ids}
    )
    
    return await get_approval(approval_id)

@router.get("")
async def list_approvals(status: Optional[str] = None, type: Optional[str] = None):
    query = "SELECT * FROM os_approvals WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = ?"
        params.append(status)
    if type:
        query += " AND type = ?"
        params.append(type)
        
    query += " ORDER BY created_at DESC"
    
    rows = await db_all(query, params)
    approvals = []
    for r in rows:
        app_dict = dict(r)
        if app_dict.get("payload"):
            app_dict["payload"] = json.loads(app_dict["payload"])
        if app_dict.get("linked_issue_ids"):
            app_dict["linked_issue_ids"] = json.loads(app_dict["linked_issue_ids"])
        approvals.append(app_dict)
        
    return approvals

@router.get("/{approval_id}")
async def get_approval(approval_id: str):
    rows = await db_all("SELECT * FROM os_approvals WHERE id = ?", [approval_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Approval not found")
        
    approval = dict(rows[0])
    if approval.get("payload"):
        approval["payload"] = json.loads(approval["payload"])
    if approval.get("linked_issue_ids"):
        approval["linked_issue_ids"] = json.loads(approval["linked_issue_ids"])
        
    return approval

async def _resolve_approval(approval_id: str, status: str, resolution_comment: Optional[str], resolved_by: str):
    rows = await db_all("SELECT * FROM os_approvals WHERE id = ?", [approval_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Approval not found")
        
    approval = dict(rows[0])
    
    # Simple state machine check
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot transition approval from {approval['status']} to {status}")
        
    now = datetime.now(timezone.utc).isoformat()
    
    await db_run(
        "UPDATE os_approvals SET status = ?, resolution_comment = ?, resolved_by = ?, resolved_at = ? WHERE id = ?",
        [status, resolution_comment, resolved_by, now, approval_id]
    )
    
    event_type_map = {
        "approved": EventType.APPROVAL_APPROVED,
        "rejected": EventType.APPROVAL_REJECTED,
        "revision_requested": EventType.APPROVAL_REVISION_REQUESTED
    }
    
    await event_bus.emit(
        event_type=event_type_map[status],
        source_type="approval",
        source_id=approval_id,
        actor_id=resolved_by,
        actor_type="human",
        payload={"comment": resolution_comment}
    )
    
    # If the approval is linked to an issue, optionally drop a comment on the issue
    linked_issues = json.loads(approval["linked_issue_ids"]) if approval.get("linked_issue_ids") else []
    for issue_id in linked_issues:
        try:
            await issue_service.add_comment(
                issue_id=issue_id,
                author_id=resolved_by,
                body=f"Approval {approval_id} has been **{status}**.\n\nReason: {resolution_comment or 'No comment provided.'}",
                author_type="human"
            )
        except Exception:
            pass # ignore if issue not found
            
    return await get_approval(approval_id)

@router.post("/{approval_id}/approve")
async def approve(approval_id: str, body: ApprovalResolution, x_user_id: str = Header("system")):
    return await _resolve_approval(approval_id, "approved", body.resolution_comment, x_user_id)

@router.post("/{approval_id}/reject")
async def reject(approval_id: str, body: ApprovalResolution, x_user_id: str = Header("system")):
    return await _resolve_approval(approval_id, "rejected", body.resolution_comment, x_user_id)

@router.post("/{approval_id}/request-revision")
async def request_revision(approval_id: str, body: ApprovalRevisionRequest, x_user_id: str = Header("system")):
    return await _resolve_approval(approval_id, "revision_requested", body.resolution_comment, x_user_id)

@router.post("/{approval_id}/resubmit")
async def resubmit(approval_id: str, x_user_id: str = Header("system")):
    rows = await db_all("SELECT * FROM os_approvals WHERE id = ?", [approval_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Approval not found")
        
    approval = dict(rows[0])
    
    if approval["status"] != "revision_requested":
        raise HTTPException(status_code=400, detail="Can only resubmit an approval in revision_requested state")
        
    now = datetime.now(timezone.utc).isoformat()
    
    await db_run(
        "UPDATE os_approvals SET status = 'pending', resolved_at = NULL WHERE id = ?",
        [approval_id]
    )
    
    await event_bus.emit(
        event_type=EventType.APPROVAL_RESUBMITTED,
        source_type="approval",
        source_id=approval_id,
        actor_id=x_user_id,
        payload={}
    )
    
    return await get_approval(approval_id)
