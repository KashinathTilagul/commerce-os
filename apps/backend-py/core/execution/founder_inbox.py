from core.execution.bottleneck_tracker import BottleneckTracker
from core.database import db_all
from core.services.task_service import task_service
from core.services.revenue_service import revenue_service

class FounderInbox:
    @staticmethod
    async def generate_inbox():
        # Fetch live tasks
        tasks = await task_service.get_all_tasks(500)
        
        top_tasks = []
        blocked_tasks = []
        overdue_tasks = []
        pending_approvals = []
        
        for t in tasks:
            task_dict = dict(t)
            status = task_dict["status"]
            if status in ["IN_PROGRESS", "PENDING"]:
                if task_dict.get("revenue_impact", 0) > 0:
                    top_tasks.append(task_dict)
            if status == "BLOCKED":
                blocked_tasks.append(task_dict)
            if status == "OVERDUE":
                overdue_tasks.append(task_dict)
            if status == "PENDING_APPROVAL":
                pending_approvals.append(task_dict)
                
        top_tasks.sort(key=lambda x: x.get("revenue_impact", 0), reverse=True)
        
        # Calculate execution score
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t["status"] == "COMPLETED"])
        overdue_count = len(overdue_tasks)
        blocked_count = len(blocked_tasks)
        
        base_score = 100
        # Check for reality metrics to see if data confidence is high
        revenue = await revenue_service.get_recent_revenue(1)
        has_verified_data = len(revenue) > 0
        
        from core.source_registry import get_metric_confidence
        rev_conf = await get_metric_confidence("revenue", revenue[0]["data_source"] if revenue else "UNVERIFIED")
        data_conf = rev_conf["confidence"]

        if total_tasks > 0:
            base_score = int((completed_tasks / total_tasks) * 100)
            execution_score = max(0, base_score - (overdue_count * 10) - (blocked_count * 15))
            
            exec_score_obj = {
                "value": execution_score,
                "data_confidence": data_conf,
                "operational_confidence": 100,
                "strategic_confidence": 100,
                "status": "PARTIAL",
                "source": "Operational Tasks",
                "reason": "Execution score is fully traceable but business impact requires verified live data sync."
            }
        else:
            exec_score_obj = None

        inbox = {
            "execution_score": exec_score_obj,
            "top_opportunity": None,
            "biggest_risk": None,
            "most_important_decision": None,
            "bottleneck": None,
            "top_3_revenue_tasks": [
                {
                    **task,
                    "intelligence": {
                        "data_confidence": data_conf,
                        "operational_confidence": 100,
                        "strategic_confidence": 90,
                        "status": "PARTIAL",
                        "source": "Task Engine",
                        "reason": "Task assigned and tracked; revenue impact estimate requires live data integration."
                    }
                }
                for task in top_tasks[:3]
            ],
            "blocked_projects": blocked_tasks,
            "overdue_tasks": overdue_tasks,
            "pending_approvals": pending_approvals,
            "overdue_count": overdue_count,
            "blocked_count": blocked_count
        }
        
        return inbox
