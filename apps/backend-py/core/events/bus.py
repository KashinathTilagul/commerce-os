"""
EKVAAR OS — Event Bus (V1: In-Memory + SQLite Persistence)

The backbone of OS automation. All subsystems emit events through this bus.
Events are persisted to the `event_ledger` table and dispatched to listeners.

In V1 this is an in-memory bus to avoid external infrastructure complexity
(no Kafka/RabbitMQ). The relational database IS the queue.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from core.database import db_run

logger = logging.getLogger(__name__)

# Type alias for listener callbacks
EventListener = Callable[[Dict[str, Any]], Any]


class EventBus:
    """
    In-memory event bus with SQLite persistence.

    Usage:
        from core.events.bus import event_bus
        from core.events.types import EventType

        # Emit an event
        await event_bus.emit(
            event_type=EventType.ISSUE_CREATED,
            source_type="issue",
            source_id="ISS-001",
            actor_id="founder",
            actor_type="human",
            payload={"title": "Fix homepage layout"}
        )

        # Listen for events
        @event_bus.on(EventType.ISSUE_STATUS_CHANGED)
        async def handle_status_change(event):
            print(f"Issue {event['source_id']} changed status")
    """

    def __init__(self):
        self._listeners: Dict[str, List[EventListener]] = {}

    def on(self, event_type: str):
        """Decorator to register a listener for a specific event type."""
        def decorator(fn: EventListener):
            if event_type not in self._listeners:
                self._listeners[event_type] = []
            self._listeners[event_type].append(fn)
            logger.info(f"[EventBus] Registered listener for {event_type}: {fn.__name__}")
            return fn
        return decorator

    def subscribe(self, event_type: str, callback: EventListener):
        """Programmatic way to subscribe to an event type."""
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(callback)

    async def emit(
        self,
        event_type: str,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_type: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Emit an event. Persists to the event_ledger and notifies listeners.

        Returns the event ID.
        """
        event_id = f"evt_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc).isoformat()

        event = {
            "id": event_id,
            "event_type": event_type,
            "source_type": source_type,
            "source_id": source_id,
            "actor_id": actor_id,
            "actor_type": actor_type,
            "payload": payload or {},
            "created_at": now,
        }

        # Persist to event_ledger
        try:
            await db_run(
                """
                INSERT INTO event_ledger
                (id, event_type, source_type, source_id, actor_id, actor_type, payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    event_id,
                    event_type,
                    source_type,
                    source_id,
                    actor_id,
                    actor_type,
                    json.dumps(payload or {}),
                    now,
                ],
            )
        except Exception as e:
            logger.error(f"[EventBus] Failed to persist event {event_type}: {e}")

        # Dispatch to listeners (fire-and-forget, errors logged but not propagated)
        listeners = self._listeners.get(event_type, [])
        wildcard_listeners = self._listeners.get("*", [])
        all_listeners = listeners + wildcard_listeners

        for listener in all_listeners:
            try:
                result = listener(event)
                if asyncio.iscoroutine(result):
                    asyncio.create_task(result)
            except Exception as e:
                logger.error(
                    f"[EventBus] Listener {listener.__name__} failed for {event_type}: {e}"
                )

        if all_listeners:
            logger.debug(
                f"[EventBus] {event_type} dispatched to {len(all_listeners)} listener(s)"
            )

        return event_id


# ── Global singleton ──────────────────────────────────────────────────
event_bus = EventBus()
