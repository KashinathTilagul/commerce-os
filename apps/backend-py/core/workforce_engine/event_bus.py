"""
EKVAAR OS - Workforce Engine: Event Bus
"""
import asyncio
import logging
from typing import Callable, Any, Dict, List

logger = logging.getLogger(__name__)

class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {
            "TaskCreated": [],
            "TaskCompleted": [],
            "ApprovalRequested": [],
            "ApprovalGranted": [],
            "EscalationCreated": [],
            "MessageSent": [],
            "KnowledgeApproved": [],
            "ExperienceCreated": []
        }

    def subscribe(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        """Subscribe an async callback to a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    async def publish(self, event_type: str, payload: Dict[str, Any]):
        """Publish an event to all subscribers."""
        if event_type not in self._subscribers:
            logger.warning(f"Event {event_type} published but no subscribers found.")
            return

        logger.info(f"[EventBus] Publishing {event_type}: {payload}")
        
        # Fire and forget all callbacks
        for callback in self._subscribers[event_type]:
            try:
                # Schedule as a background task so a failing subscriber doesn't block others
                asyncio.create_task(callback(payload))
            except Exception as e:
                logger.error(f"[EventBus] Error executing callback for {event_type}: {e}")

# Global singleton event bus
workforce_event_bus = EventBus()
