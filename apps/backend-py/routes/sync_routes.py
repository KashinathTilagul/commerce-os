from fastapi import APIRouter
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
import asyncio

from core.database import db_run
from integrations.shopify_sync import run_shopify_sync

router = APIRouter(prefix="/sync")

class SyncTriggerPayload(BaseModel):
    source: str

@router.post("/trigger")
async def trigger_sync(payload: SyncTriggerPayload):
    sync_id = uuid.uuid4().hex
    
    # Log sync start
    await db_run(
        "INSERT INTO sync_log (sync_id, source_system, started_at, status) VALUES (?, ?, ?, ?)",
        [sync_id, payload.source, datetime.now(timezone.utc).isoformat(), "RUNNING"]
    )
    
    if payload.source.lower() == "shopify":
        # Run integration in background
        asyncio.create_task(run_shopify_sync(sync_id))
        return {"status": "success", "message": "Shopify sync initiated in background.", "sync_id": sync_id}
    
    # If source is not implemented
    await db_run(
        "UPDATE sync_log SET status = ?, completed_at = ?, error_message = ? WHERE sync_id = ?",
        ["FAILED", datetime.now(timezone.utc).isoformat(), "Source not supported.", sync_id]
    )
    return {"status": "error", "message": "Unsupported source."}
