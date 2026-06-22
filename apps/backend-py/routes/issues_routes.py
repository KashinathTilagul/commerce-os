from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from core.services.issue_service import issue_service, IssueNotFoundError

router = APIRouter(prefix="/api/issues", tags=["Issues"])

class IssueCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    status: str = "backlog"
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    labels: List[str] = []

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    project_id: Optional[str] = None
    labels: Optional[List[str]] = None

class CommentCreate(BaseModel):
    body: str

class CheckoutRequest(BaseModel):
    agent_id: str

@router.post("")
async def create_issue(issue: IssueCreate, x_user_id: Optional[str] = Header("system")):
    created = await issue_service.create_issue(
        title=issue.title,
        description=issue.description,
        priority=issue.priority,
        status=issue.status,
        assignee_id=issue.assignee_id,
        project_id=issue.project_id,
        labels=issue.labels,
        creator_id=x_user_id
    )
    return created

@router.get("")
async def list_issues(status: Optional[str] = None, assignee_id: Optional[str] = None):
    return await issue_service.list_issues(status, assignee_id)

@router.get("/{issue_id}")
async def get_issue(issue_id: str):
    try:
        return await issue_service.get_issue(issue_id)
    except IssueNotFoundError:
        raise HTTPException(status_code=404, detail="Issue not found")

@router.patch("/{issue_id}")
async def update_issue(issue_id: str, updates: IssueUpdate, x_user_id: Optional[str] = Header("system")):
    try:
        return await issue_service.update_issue(issue_id, updates.dict(exclude_unset=True), actor_id=x_user_id)
    except IssueNotFoundError:
        raise HTTPException(status_code=404, detail="Issue not found")

@router.post("/{issue_id}/checkout")
async def checkout_issue(issue_id: str, request: CheckoutRequest, x_ekvaar_os_run_id: str = Header(...)):
    try:
        return await issue_service.checkout_issue(issue_id, request.agent_id, x_ekvaar_os_run_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{issue_id}/checkin")
async def checkin_issue(issue_id: str, request: CheckoutRequest):
    try:
        return await issue_service.checkin_issue(issue_id, request.agent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{issue_id}/comments")
async def add_comment(issue_id: str, comment: CommentCreate, x_user_id: str = Header("system"), x_ekvaar_os_run_id: Optional[str] = Header(None)):
    author_type = "agent" if x_ekvaar_os_run_id else "human"
    try:
        return await issue_service.add_comment(issue_id, x_user_id, comment.body, author_type, x_ekvaar_os_run_id)
    except IssueNotFoundError:
        raise HTTPException(status_code=404, detail="Issue not found")

@router.get("/{issue_id}/comments")
async def list_comments(issue_id: str):
    return await issue_service.list_comments(issue_id)
