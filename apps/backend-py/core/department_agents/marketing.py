from core.reality_integration.live_metrics import LiveMetrics
from core.approval_engine.decision_queue import DecisionQueue

class MarketingAgent:
    @staticmethod
    async def analyze_and_propose():
        metrics = await LiveMetrics.get_all_metrics()
        roas = metrics.get("ROAS", 0)
        
        # If ROAS is good, propose spend
        if roas > 3.0:
            return await DecisionQueue.queue_decision(
                agent="Marketing Agent",
                action_type="SPEND",
                description="Increase daily ad budget by ₹10,000 across winning creative sets to scale ROAS.",
                confidence=0.88,
                impact=0.7,
                risk=0.4
            )
        return None
