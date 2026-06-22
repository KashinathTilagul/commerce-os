import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.database import db_all, db_get, db_run

router = APIRouter(prefix="/inbox")

class InboxActionBody(BaseModel):
    action: str  # Approve, Reject, Resolve, Assign, Snooze

@router.get("/")
async def get_inbox():
    try:
        # Fetch only pending items, sorted by priority (P0 first) then creation date
        items = await db_all(
            "SELECT * FROM founder_inbox WHERE status IN ('PENDING', 'SNOOZED') ORDER BY priority ASC, created_at DESC"
        )
        return {"success": True, "items": items}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/unread")
async def get_unread():
    try:
        result = await db_get("SELECT COUNT(*) as count FROM founder_inbox WHERE status = 'PENDING'")
        return {"success": True, "count": result["count"] if result else 0}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/{item_id}/action")
async def inbox_action(item_id: str, body: InboxActionBody):
    try:
        item = await db_get("SELECT * FROM founder_inbox WHERE id = ?", [item_id])
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        action = body.action.upper()
        new_status = "RESOLVED"
        
        if action == "SNOOZE":
            new_status = "SNOOZED"
        elif action == "REJECT":
            new_status = "DISMISSED"

        # Update inbox item
        await db_run(
            "UPDATE founder_inbox SET status = ?, resolved_at = ? WHERE id = ?",
            [new_status, datetime.utcnow().isoformat(), item_id]
        )

        # Log history
        history_id = str(uuid.uuid4())
        await db_run(
            "INSERT INTO founder_inbox_history (history_id, inbox_id, action_taken, actor, previous_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [history_id, item_id, action, "FOUNDER", item["status"], new_status, datetime.utcnow().isoformat()]
        )

        return {"success": True, "new_status": new_status}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
