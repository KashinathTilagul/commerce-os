import asyncio
from typing import Callable, Dict, List, Any
import json

class EventEmitter:
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def on(self, event_type: str, listener: Callable):
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(listener)

    async def emit(self, event_type: str, payload: Dict[str, Any]):
        if event_type in self._listeners:
            tasks = []
            for listener in self._listeners[event_type]:
                tasks.append(listener(payload))
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

# Global event dispatcher
dispatcher = EventEmitter()
