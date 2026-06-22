"""
EKVAAR OS - Workforce Runtime: Workload Allocator
"""
from core.database import db_get

class WorkloadAllocator:
    MAX_CONCURRENT_TASKS_PER_EMPLOYEE = 5
    
    @staticmethod
    async def can_accept_work(employee_id: str) -> bool:
        """
        Ensures an employee is not overloaded before assigning new work.
        """
        row = await db_get("SELECT COUNT(*) as c FROM workforce_tasks WHERE assigned_to = ? AND status IN ('PENDING', 'IN_PROGRESS')", [employee_id])
        active_tasks = row["c"] if row else 0
        
        # If they have 5 or more active tasks, they cannot accept new work
        if active_tasks >= WorkloadAllocator.MAX_CONCURRENT_TASKS_PER_EMPLOYEE:
            return False
            
        return True
