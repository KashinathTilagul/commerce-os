"""
EKVAAR OS - Intelligence Layer: Tool Registry
"""
import uuid
from core.database import db_run, db_get, db_all

class ToolRegistry:
    @staticmethod
    async def register_tool(name: str, category: str, description: str, endpoint: str) -> str:
        """
        Categories: Internal Tools, External Tools, System Tools, Future Integrations
        """
        tool_id = f"tool_{uuid.uuid4().hex}"
        await db_run(
            """
            INSERT INTO intel_tools (id, name, category, description, endpoint, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [tool_id, name, category, description, endpoint, "ACTIVE"]
        )
        return tool_id

    @staticmethod
    async def get_tool(tool_name: str) -> dict:
        return await db_get("SELECT * FROM intel_tools WHERE name = ? AND status = 'ACTIVE'", [tool_name])

    @staticmethod
    async def seed_core_tools() -> None:
        """Seeds the required first-class tools."""
        tools = [
            ("Knowledge Vault", "Internal Tools", "Access organizational memory.", "internal://kv"),
            ("Board Room", "Internal Tools", "Read dashboard metrics.", "internal://boardroom"),
            ("Communication", "System Tools", "Send messages.", "internal://comm"),
            ("Calendar", "System Tools", "Read/Write schedules.", "internal://calendar"),
            ("File Manager", "System Tools", "Read/Write files.", "internal://fs"),
            ("Browser", "External Tools", "Web navigation.", "external://browser")
        ]
        
        # In a real setup, we would check existence first. For simplicity:
        await db_run("DELETE FROM intel_tools")
        for t in tools:
            await ToolRegistry.register_tool(t[0], t[1], t[2], t[3])
