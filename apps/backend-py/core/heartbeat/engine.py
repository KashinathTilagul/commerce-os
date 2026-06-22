"""
EKVAAR OS — Heartbeat Engine

The heartbeat engine is the core execution loop for agents.
It manages runs, context assembly, and LLM execution.
"""

import uuid
from datetime import datetime, timezone
import logging
from typing import Dict, Any, Optional

from core.database import db_run, db_all
from core.events.bus import event_bus
from core.events.types import EventType
from core.services.issue_service import issue_service

logger = logging.getLogger(__name__)

class HeartbeatEngine:
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
        
    async def wake(self, agent_id: str, trigger_type: str, issue_id: Optional[str] = None, routine_id: Optional[str] = None) -> str:
        """
        Wakes up an agent to perform work.
        Returns the run_id.
        """
        run_id = f"run_{uuid.uuid4().hex[:16]}"
        now = self._now()
        
        await db_run(
            """
            INSERT INTO runs (id, agent_id, issue_id, routine_id, trigger_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [run_id, agent_id, issue_id, routine_id, trigger_type, "queued", now]
        )
        
        await event_bus.emit(
            event_type=EventType.RUN_CREATED,
            source_type="run",
            source_id=run_id,
            actor_id="system",
            payload={"agent_id": agent_id, "trigger_type": trigger_type}
        )
        
        # In a fully distributed system, this might push to a queue (e.g., Celery/SQS).
        # For V1, we just run it directly (but we should probably background it).
        import asyncio
        asyncio.create_task(self._execute_run(run_id, agent_id, issue_id))
        
        return run_id
        
    async def _execute_run(self, run_id: str, agent_id: str, issue_id: Optional[str]):
        """The actual execution loop for a run."""
        try:
            now = self._now()
            await db_run("UPDATE runs SET status = 'running', started_at = ? WHERE id = ?", [now, run_id])
            await event_bus.emit(EventType.RUN_STARTED, "run", run_id, "system")
            
            # 1. Checkout Issue
            if issue_id:
                await issue_service.checkout_issue(issue_id, agent_id, run_id)
                
            # 2. Load Context (Mocked for now)
            # context = await context_assembler.build_context(agent_id, issue_id)
            
            # 3. Execute LLM (Mocked for now)
            # result = await llm_adapter.generate(context)
            
            # Simulated execution delay
            import asyncio
            await asyncio.sleep(2)
            
            # 4. Post Results (Mocked for now - just add a comment if issue exists)
            if issue_id:
                await issue_service.add_comment(
                    issue_id=issue_id,
                    author_id=agent_id,
                    body=f"Executed run {run_id} successfully.",
                    author_type="agent",
                    run_id=run_id
                )
                
            # 5. Checkin Issue
            if issue_id:
                await issue_service.checkin_issue(issue_id, agent_id)
                
            now = self._now()
            await db_run("UPDATE runs SET status = 'completed', completed_at = ? WHERE id = ?", [now, run_id])
            await event_bus.emit(EventType.RUN_COMPLETED, "run", run_id, "system")
            
        except Exception as e:
            logger.error(f"Run {run_id} failed: {e}")
            now = self._now()
            await db_run("UPDATE runs SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?", [now, str(e), run_id])
            await event_bus.emit(EventType.RUN_FAILED, "run", run_id, "system", payload={"error": str(e)})
            
            if issue_id:
                try:
                    await issue_service.checkin_issue(issue_id, agent_id)
                except Exception as checkin_err:
                    logger.error(f"Failed to checkin issue {issue_id} after run {run_id} failure: {checkin_err}")

heartbeat_engine = HeartbeatEngine()
