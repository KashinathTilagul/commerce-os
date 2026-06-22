import uuid
from datetime import datetime
from typing import Dict, Any
from core.database import db_run
from core.events.dispatcher import dispatcher

async def handle_escalation(event: Dict[str, Any]):
    """
    Escalation Rules Engine.
    Filters events. If an agent can handle it, it doesn't go to founder_inbox.
    If it requires founder approval or is an exception, it creates a founder_inbox item.
    """
    source_type = event.get("source_type", "SYSTEM")
    priority = event.get("priority", "P3")
    category = event.get("category", "SYSTEM")
    
    # In a real engine, we'd check if an agent can auto-resolve.
    # For now, we assume events dispatched here are explicitly escalated.

    inbox_id = str(uuid.uuid4())
    payload_json = json.dumps(event.get("payload", {}))
    
    await db_run(
        """
        INSERT INTO founder_inbox (
            id, source_type, source_id, category, priority, title, summary, 
            recommended_action, approve_consequence, ignore_consequence, deep_link, payload_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
        """,
        [
            inbox_id,
            source_type,
            event.get("source_id", ""),
            category,
            priority,
            event.get("title", "Escalation"),
            event.get("summary", ""),
            event.get("recommended_action", ""),
            event.get("approve_consequence", ""),
            event.get("ignore_consequence", ""),
            event.get("deep_link", ""),
            payload_json,
            datetime.utcnow().isoformat()
        ]
    )

import json
# Register the escalation handler
dispatcher.on("escalation_required", handle_escalation)
