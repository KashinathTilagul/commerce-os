"""
EKVAAR OS - Intelligence Layer: Capability Mapper
"""
from core.database import db_run, db_all

class CapabilityMapper:
    @staticmethod
    async def grant_capability(employee_id: str, capability_name: str) -> None:
        """Grants an employee the right to request a specific capability/tool."""
        await db_run(
            """
            INSERT OR IGNORE INTO intel_employee_capabilities (id, employee_id, capability_name, status)
            VALUES (?, ?, ?, ?)
            """,
            [f"cap_{employee_id}_{capability_name}", employee_id, capability_name, "ACTIVE"]
        )

    @staticmethod
    async def check_capability(employee_id: str, capability_name: str) -> bool:
        """Verifies if the employee is allowed to use this capability/tool."""
        rows = await db_all("SELECT * FROM intel_employee_capabilities WHERE employee_id = ? AND capability_name = ? AND status = 'ACTIVE'", [employee_id, capability_name])
        return len(rows) > 0
