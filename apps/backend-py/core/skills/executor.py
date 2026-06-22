import subprocess
import sys
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class SkillRegistry:
    def __init__(self):
        self.skills = {}
        self._register_default_skills()

    def register(self, name: str, description: str, handler):
        self.skills[name] = {
            "description": description,
            "handler": handler
        }

    def _register_default_skills(self):
        # 1. Python Code Execution (Sandbox simulation)
        self.register(
            "execute_python",
            "Safely runs a Python snippet and returns output",
            self.execute_python
        )
        
        # 2. Database Query Executor
        self.register(
            "query_db",
            "Executes read-only SQL queries on the OS database",
            self.query_db
        )

    def execute_python(self, code: str) -> Dict[str, Any]:
        """Runs python code snippet."""
        try:
            # Simple local sub-process invocation
            process = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=5
            )
            return {
                "success": process.returncode == 0,
                "stdout": process.stdout,
                "stderr": process.stderr
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Execution timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def query_db(self, query: str) -> Dict[str, Any]:
        """Executes query on SQLite business DB."""
        from core.database import db_all
        try:
            # Basic read-only safety check
            upper_query = query.upper()
            if "INSERT" in upper_query or "UPDATE" in upper_query or "DELETE" in upper_query or "DROP" in upper_query:
                return {"success": False, "error": "Write operations not permitted via query_db skill"}
            
            results = await db_all(query)
            return {"success": True, "results": results}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_skill_manifest(self) -> List[Dict[str, Any]]:
        return [
            {"name": name, "description": data["description"]}
            for name, data in self.skills.items()
        ]

# Global skill registry
skills_registry = SkillRegistry()
