"""
EKVAAR OS - Mission Zero: Controlled Mission Sandbox
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class MissionSandbox:
    @staticmethod
    async def launch_simulation(mission_name: str) -> str:
        """
        Starts a simulated mission (e.g. Mission Alpha - Simulated Product Launch).
        """
        mission_id = f"sim_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO mz_mission_sandbox (id, mission_name, status, score, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [mission_id, mission_name, "IN_PROGRESS", 0.0, now]
        )
        return mission_id

    @staticmethod
    async def complete_simulation(mission_id: str, score: float) -> None:
        """
        Records the outcome of the simulation.
        """
        await db_run(
            "UPDATE mz_mission_sandbox SET status = 'COMPLETED', score = ? WHERE id = ?",
            [score, mission_id]
        )
