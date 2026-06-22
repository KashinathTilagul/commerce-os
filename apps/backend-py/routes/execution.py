from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import db_all, db_run, db_get
from core.services.task_service import task_service
from core.execution.bottleneck_tracker import BottleneckTracker
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/execution", tags=["Execution"])

class TaskAction(BaseModel):
    action: str  # APPROVE, REJECT, COMPLETE
    
@router.get("/inbox")
async def get_inbox():
    from core.execution.founder_inbox import FounderInbox
    return await FounderInbox.generate_inbox()

@router.get("/tasks")
async def get_tasks():
    tasks = await task_service.get_all_tasks(100)
    return {"tasks": tasks}

@router.post("/tasks/{task_id}/action")
async def task_action(task_id: str, action: TaskAction):
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_status = task["status"]
    if action.action == "COMPLETE":
        new_status = "COMPLETED"
    elif action.action == "APPROVE":
        new_status = "IN_PROGRESS"
    elif action.action == "REJECT":
        new_status = "BLOCKED"
        
    completion_pct = 100 if new_status == "COMPLETED" else task.get("completion_pct", 0)
    await task_service.update_task_status(task_id, new_status, completion_pct)
    
    await db_run(
        "INSERT INTO gov_audit_log (id, action_type, actor, target, trace_data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), action.action, "FOUNDER", task_id, json.dumps({"previous": task["status"], "new": new_status}), datetime.utcnow().isoformat())
    )
    
    return {"status": "success", "new_status": new_status}

@router.get("/metrics")
async def get_metrics():
    rows = await db_all("SELECT metric_name, value FROM production_live_metrics")
    return {"metrics": {r["metric_name"]: r["value"] for r in rows}}

@router.get("/bottleneck")
async def get_bottleneck():
    metrics_rows = await db_all("SELECT metric_name, value FROM production_live_metrics")
    metrics = {row["metric_name"]: row["value"] for row in metrics_rows}
    bottleneck = BottleneckTracker.detect_bottleneck(metrics)
    return {"bottleneck": bottleneck}
