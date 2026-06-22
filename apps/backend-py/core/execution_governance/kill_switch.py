"""
EKVAAR OS - Execution Governance: Kill Switch
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class KillSwitch:
    @staticmethod
    async def get_state(target_type: str, target_id: str = "GLOBAL") -> bool:
        """Returns True if the target is paused/killed."""
        row = await db_get(
            "SELECT is_paused FROM gov_kill_switch WHERE target_type = ? AND target_id = ?",
            [target_type, target_id]
        )
        if row and row["is_paused"] == 1:
            return True
            
        # If we check a department or employee, we must also check GLOBAL
        if target_type != "GLOBAL":
            global_row = await db_get("SELECT is_paused FROM gov_kill_switch WHERE target_type = 'GLOBAL' AND target_id = 'GLOBAL'")
            if global_row and global_row["is_paused"] == 1:
                return True
                
        return False

    @staticmethod
    async def toggle_switch(target_type: str, target_id: str, is_paused: bool, reason: str = "") -> None:
        """
        Activates or deactivates the kill switch for a specific target.
        target_type can be: GLOBAL, DEPARTMENT, EMPLOYEE.
        """
        ks_id = f"ks_{uuid.uuid4().hex}"
        updated_at = datetime.now(timezone.utc).isoformat()
        
        # Upsert
        existing = await db_get("SELECT id FROM gov_kill_switch WHERE target_type = ? AND target_id = ?", [target_type, target_id])
        if existing:
            await db_run(
                "UPDATE gov_kill_switch SET is_paused = ?, reason = ?, updated_at = ? WHERE target_type = ? AND target_id = ?",
                [1 if is_paused else 0, reason, updated_at, target_type, target_id]
            )
        else:
            await db_run(
                "INSERT INTO gov_kill_switch (id, target_type, target_id, is_paused, reason, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                [ks_id, target_type, target_id, 1 if is_paused else 0, reason, updated_at]
            )

    @staticmethod
    async def emergency_stop() -> None:
        """Immediate GLOBAL halt to all execution."""
        await KillSwitch.toggle_switch("GLOBAL", "GLOBAL", True, "EMERGENCY_STOP_TRIGGERED")
