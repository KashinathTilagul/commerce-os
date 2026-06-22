from core.services.task_service import task_service

class AccountabilityEngine:
    @staticmethod
    async def run_audit():
        tasks = await task_service.get_all_tasks(500)
        
        overdue = [t for t in tasks if t["status"] == "OVERDUE"]
        blocked = [t for t in tasks if t["status"] == "BLOCKED"]
        unowned = [t for t in tasks if not t["owner"] or t["owner"] == ""]
        completed = [t for t in tasks if t["status"] == "COMPLETED"]
        
        # Calculate execution score
        total_active = len([t for t in tasks if t["status"] != "PENDING_APPROVAL"])
        if total_active == 0:
            execution_score = 100
        else:
            execution_score = int((len(completed) / total_active) * 100)
            
        # Penalize for overdue/blocked
        execution_score -= (len(overdue) * 5)
        execution_score -= (len(blocked) * 2)
        execution_score = max(0, min(100, execution_score))
        
        return {
            "execution_score": execution_score,
            "overdue_count": len(overdue),
            "blocked_count": len(blocked),
            "unowned_count": len(unowned),
            "completed_count": len(completed),
            "alerts": [
                f"OVERDUE: {t['title']} (Owner: {t['owner']})" for t in overdue
            ] + [
                f"BLOCKED: {t['title']} (Blocker: {t['blocker']})" for t in blocked
            ]
        }
