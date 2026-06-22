from core.services.task_service import task_service

class MissionTracker:
    @staticmethod
    async def track_revenue_impact():
        tasks = await task_service.get_all_tasks(500)
        
        expected_revenue = 0
        realized_revenue = 0
        at_risk_revenue = 0
        
        for t in tasks:
            if t["revenue_impact"]:
                expected_revenue += t["revenue_impact"]
                if t["status"] == "COMPLETED":
                    realized_revenue += t["revenue_impact"]
                if t["status"] == "BLOCKED" or t["status"] == "OVERDUE":
                    at_risk_revenue += t["revenue_impact"]
                    
        return {
            "total_expected_revenue_impact": expected_revenue,
            "realized_revenue": realized_revenue,
            "at_risk_revenue": at_risk_revenue
        }
