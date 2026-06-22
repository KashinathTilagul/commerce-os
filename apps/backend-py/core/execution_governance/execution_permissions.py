"""
EKVAAR OS - Execution Governance: Execution Permissions
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class ExecutionPermissions:
    @staticmethod
    async def initialize_employee(employee_id: str) -> None:
        """
        Sets an employee to DEFAULT READ ONLY mode.
        """
        perm_id = f"perm_{uuid.uuid4().hex}"
        updated_at = datetime.now(timezone.utc).isoformat()
        # Default: All actions are 0 (False), making them read-only
        await db_run(
            """
            INSERT OR IGNORE INTO gov_permissions 
            (id, employee_id, updated_at)
            VALUES (?, ?, ?)
            """,
            [perm_id, employee_id, updated_at]
        )

    @staticmethod
    async def grant_permission(employee_id: str, permission_field: str) -> None:
        """Grants a specific execution right."""
        allowed_fields = [
            "can_research", "can_recommend", "can_analyze", 
            "can_create_tasks", "can_delegate", "can_spend", 
            "can_modify", "can_execute"
        ]
        if permission_field in allowed_fields:
            await db_run(f"UPDATE gov_permissions SET {permission_field} = 1 WHERE employee_id = ?", [employee_id])

    @staticmethod
    async def check_permission(employee_id: str, action: str) -> bool:
        """
        Validates if the employee is legally permitted to execute the requested action.
        """
        row = await db_get("SELECT * FROM gov_permissions WHERE employee_id = ?", [employee_id])
        if not row:
            return False
            
        field_map = {
            "RESEARCH": "can_research",
            "RECOMMEND": "can_recommend",
            "ANALYZE": "can_analyze",
            "CREATE_TASK": "can_create_tasks",
            "DELEGATE": "can_delegate",
            "SPEND": "can_spend",
            "MODIFY": "can_modify",
            "EXECUTE": "can_execute"
        }
        field = field_map.get(action)
        if not field:
            return False
            
        return bool(row[field])
