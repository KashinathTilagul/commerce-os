"""
EKVAAR OS - Workforce Engine: Organizational Memory Service
"""
import uuid
import json
from datetime import datetime, timezone

from core.database import db_run, db_get
from core.events.bus import event_bus

class OrganizationalMemoryService:
    @staticmethod
    async def store_memory(memory_type: str, content: str, metadata: dict = None) -> str:
        """
        Store a verified piece of organizational memory.
        memory_type: DECISION, EXPERIENCE, LESSON, PLAYBOOK, KNOWLEDGE
        """
        memory_id = f"mem_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        metadata_json = json.dumps(metadata) if metadata else "{}"

        await db_run(
            """
            INSERT INTO workforce_memory 
            (id, type, content, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [memory_id, memory_type, content, metadata_json, created_at]
        )

        return memory_id

    @staticmethod
    async def retrieve_memory(memory_id: str) -> dict:
        return await db_get("SELECT * FROM workforce_memory WHERE id = ?", [memory_id])


# Event Listeners to auto-populate Memory Service

async def on_knowledge_approved(payload: dict):
    """When CEO approves knowledge, permanently store it in Organizational Memory."""
    knowledge_id = payload.get("knowledge_id")
    knowledge = await db_get("SELECT * FROM workforce_knowledge WHERE id = ?", [knowledge_id])
    if knowledge:
        await OrganizationalMemoryService.store_memory(
            memory_type="KNOWLEDGE",
            content=knowledge["content"],
            metadata={
                "source_knowledge_id": knowledge_id,
                "title": knowledge["title"],
                "author": knowledge["author"]
            }
        )

# Register listener
event_bus.subscribe("KnowledgeApproved", on_knowledge_approved)
