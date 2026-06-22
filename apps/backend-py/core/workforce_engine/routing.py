"""
EKVAAR OS - Workforce Engine: Communication & Routing Engine
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from core.database import db_run, db_get
from core.workforce_engine.event_bus import workforce_event_bus
from core.workforce_engine.state_manager import WorkforceStateManager

class WorkforceRouter:
    @staticmethod
    async def send_message(
        sender: str,
        receiver: str,
        content: str,
        priority: str = "NORMAL",
        correlation_id: str = None
    ) -> str:
        """
        Route a message from sender to receiver.
        Enforces the rule: Employee -> Workforce Engine -> Employee
        """
        message_id = f"msg_{uuid.uuid4().hex}"
        timestamp = datetime.now(timezone.utc).isoformat()
        correlation_id = correlation_id or message_id

        # Check if the receiver has capacity (basic load balancing rule)
        can_accept = await WorkforceStateManager.can_accept_work(receiver)
        status = "DELIVERED" if can_accept else "QUEUED_DUE_TO_LOAD"

        await db_run(
            """
            INSERT INTO workforce_messages 
            (message_id, sender, receiver, priority, status, correlation_id, content, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [message_id, sender, receiver, priority, status, correlation_id, content, timestamp]
        )

        # Emit event
        await workforce_event_bus.publish("MessageSent", {
            "message_id": message_id,
            "sender": sender,
            "receiver": receiver,
            "status": status,
            "priority": priority
        })

        return message_id

    @staticmethod
    async def get_message(message_id: str) -> Optional[Dict[str, Any]]:
        return await db_get("SELECT * FROM workforce_messages WHERE message_id = ?", [message_id])
