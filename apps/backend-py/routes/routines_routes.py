from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timezone
import json

from core.database import db_all, db_run
from core.events.bus import event_bus
from core.events.types import EventType
from core.heartbeat.engine import heartbeat_engine

router = APIRouter(prefix="/api/routines", tags=["Routines"])

class RoutineCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    agent_id: str
    cron_expression: Optional[str] = None
    timezone: str = "UTC"
    status: str = "active"

class RoutineUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    status: Optional[str] = None

@router.post("")
async def create_routine(routine: RoutineCreate):
    routine_id = f"rtn_{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    await db_run(
        """
        INSERT INTO routines (id, title, description, agent_id, cron_expression, timezone, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [routine_id, routine.title, routine.description, routine.agent_id, routine.cron_expression, routine.timezone, routine.status, now, now]
    )
    
    await event_bus.emit(
        event_type=EventType.ROUTINE_CREATED,
        source_type="routine",
        source_id=routine_id,
        actor_id="system",
        payload={"agent_id": routine.agent_id, "cron": routine.cron_expression}
    )
    
    return await get_routine(routine_id)

@router.get("")
async def list_routines(agent_id: Optional[str] = None, status: Optional[str] = None):
    query = "SELECT * FROM routines WHERE 1=1"
    params = []
    
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    if status:
        query += " AND status = ?"
        params.append(status)
        
    query += " ORDER BY created_at DESC"
    
    rows = await db_all(query, params)
    return [dict(r) for r in rows]

@router.get("/{routine_id}")
async def get_routine(routine_id: str):
    rows = await db_all("SELECT * FROM routines WHERE id = ?", [routine_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Routine not found")
    return dict(rows[0])

@router.patch("/{routine_id}")
async def update_routine(routine_id: str, updates: RoutineUpdate):
    rows = await db_all("SELECT * FROM routines WHERE id = ?", [routine_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Routine not found")
        
    routine = dict(rows[0])
    update_fields = []
    params = []
    
    for key, value in updates.dict(exclude_unset=True).items():
        if routine.get(key) != value:
            update_fields.append(f"{key} = ?")
            params.append(value)
            
            if key == "status":
                if value == "paused":
                    await event_bus.emit(EventType.ROUTINE_PAUSED, "routine", routine_id, "system")
                elif value == "active":
                    await event_bus.emit(EventType.ROUTINE_RESUMED, "routine", routine_id, "system")
                    
    if not update_fields:
        return routine
        
    now = datetime.now(timezone.utc).isoformat()
    update_fields.append("updated_at = ?")
    params.append(now)
    params.append(routine_id)
    
    query = f"UPDATE routines SET {', '.join(update_fields)} WHERE id = ?"
    await db_run(query, params)
    
    return await get_routine(routine_id)

@router.post("/{routine_id}/run")
async def trigger_routine(routine_id: str):
    """Manually triggers a routine."""
    rows = await db_all("SELECT * FROM routines WHERE id = ?", [routine_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Routine not found")
        
    routine = dict(rows[0])
    
    # Update last_run_at and run_count
    now = datetime.now(timezone.utc).isoformat()
    await db_run(
        "UPDATE routines SET last_run_at = ?, run_count = run_count + 1 WHERE id = ?",
        [now, routine_id]
    )
    
    # Emit event
    await event_bus.emit(
        event_type=EventType.ROUTINE_FIRED,
        source_type="routine",
        source_id=routine_id,
        actor_id="system",
        payload={"trigger_type": "manual"}
    )
    
    # Trigger heartbeat
    run_id = await heartbeat_engine.wake(
        agent_id=routine["agent_id"],
        trigger_type="routine",
        routine_id=routine_id
    )
    
    return {"status": "triggered", "run_id": run_id}

@router.get("/{routine_id}/runs")
async def list_routine_runs(routine_id: str):
    rows = await db_all("SELECT * FROM runs WHERE routine_id = ? ORDER BY created_at DESC", [routine_id])
    return [dict(r) for r in rows]
