"""
EKVAAR OS - Execution Governance: Resource Controller
"""
import psutil
from core.database import db_get

class ResourceController:
    # Hardcoded limits to prevent "Runaway Workforce"
    MAX_CPU_PERCENT = 85.0
    MAX_MEMORY_PERCENT = 85.0
    MAX_QUEUE_SIZE = 100
    MAX_ACTIVE_WORKERS = 20

    @staticmethod
    def check_system_resources() -> dict:
        """
        Polls the local system metrics to ensure the OS isn't choking.
        """
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory().percent
        
        return {
            "cpu_percent": cpu,
            "memory_percent": mem,
            "is_safe": cpu < ResourceController.MAX_CPU_PERCENT and mem < ResourceController.MAX_MEMORY_PERCENT
        }

    @staticmethod
    async def check_workforce_capacity() -> dict:
        """
        Checks logical queue sizes and active worker counts in the database.
        """
        # Count active workers (Executing state)
        row_workers = await db_get("SELECT COUNT(*) as c FROM rt_employee_states WHERE state = 'EXECUTING'")
        active_workers = row_workers["c"] if row_workers else 0
        
        # We would check queue size from workforce_tasks or event_bus
        row_queue = await db_get("SELECT COUNT(*) as c FROM workforce_tasks WHERE status = 'PENDING'")
        queue_size = row_queue["c"] if row_queue else 0
        
        is_safe = active_workers < ResourceController.MAX_ACTIVE_WORKERS and queue_size < ResourceController.MAX_QUEUE_SIZE
        
        return {
            "active_workers": active_workers,
            "queue_size": queue_size,
            "is_safe": is_safe
        }

    @staticmethod
    async def is_safe_to_execute() -> bool:
        """
        Master gate: If False, the Workforce Runtime must sleep and refuse to pick up new tasks.
        """
        sys_res = ResourceController.check_system_resources()
        if not sys_res["is_safe"]:
            return False
            
        cap_res = await ResourceController.check_workforce_capacity()
        if not cap_res["is_safe"]:
            return False
            
        return True
