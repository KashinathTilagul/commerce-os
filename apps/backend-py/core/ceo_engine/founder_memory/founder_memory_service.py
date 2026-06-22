"""
EKVAAR OS - Founder Digital Twin: Founder Memory Service
"""
import uuid
import json
from datetime import datetime, timezone
from core.database import db_run, db_all

class FounderMemoryService:
    """
    The source of truth for the Founder Digital Twin.
    Stores decisions, explanations, corrections, priorities, and preferences.
    """
    
    @staticmethod
    async def log_evidence(memory_type: str, data: dict) -> str:
        """
        Store raw behavioral evidence (Decisions, Approvals, Rejections, Comments, etc.)
        """
        memory_id = f"fmem_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO founder_memory 
            (id, type, data_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            [memory_id, memory_type, json.dumps(data), created_at]
        )
        return memory_id

    @staticmethod
    async def get_all_evidence(limit: int = 1000) -> list:
        return await db_all("SELECT * FROM founder_memory ORDER BY created_at DESC LIMIT ?", [limit])

    @staticmethod
    async def log_decision(
        situation: str,
        options_presented: list,
        founder_choice: str,
        reason: str,
        outcome: str = "PENDING"
    ) -> str:
        """
        Explicitly log a structured Founder decision.
        """
        dec_id = f"fdec_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO founder_decisions 
            (id, situation, options_presented_json, founder_choice, reason, outcome, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [dec_id, situation, json.dumps(options_presented), founder_choice, reason, outcome, created_at]
        )
        return dec_id
