from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from core.database import db_all, db_run

router = APIRouter(prefix="/api/runs", tags=["Runs"])

class RunUpdate(BaseModel):
    status: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    cached_tokens: Optional[int] = None
    cost: Optional[float] = None
    error_message: Optional[str] = None

@router.get("")
async def list_runs(agent_id: Optional[str] = None, issue_id: Optional[str] = None, status: Optional[str] = None):
    query = "SELECT * FROM runs WHERE 1=1"
    params = []
    
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    if issue_id:
        query += " AND issue_id = ?"
        params.append(issue_id)
    if status:
        query += " AND status = ?"
        params.append(status)
        
    query += " ORDER BY created_at DESC LIMIT 100"
    
    rows = await db_all(query, params)
    return [dict(r) for r in rows]

@router.get("/{run_id}")
async def get_run(run_id: str):
    rows = await db_all("SELECT * FROM runs WHERE id = ?", [run_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Run not found")
    return dict(rows[0])

@router.patch("/{run_id}")
async def update_run(run_id: str, updates: RunUpdate):
    rows = await db_all("SELECT * FROM runs WHERE id = ?", [run_id])
    if not rows:
        raise HTTPException(status_code=404, detail="Run not found")
        
    run = dict(rows[0])
    update_fields = []
    params = []
    
    for key, value in updates.dict(exclude_unset=True).items():
        update_fields.append(f"{key} = ?")
        params.append(value)
        
    if not update_fields:
        return run
        
    params.append(run_id)
    query = f"UPDATE runs SET {', '.join(update_fields)} WHERE id = ?"
    
    await db_run(query, params)
    
    rows = await db_all("SELECT * FROM runs WHERE id = ?", [run_id])
    return dict(rows[0])
