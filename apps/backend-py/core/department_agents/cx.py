from core.reality_integration.live_metrics import LiveMetrics
from core.approval_engine.decision_queue import DecisionQueue

class CXAgent:
    @staticmethod
    async def analyze_and_propose():
        metrics = await LiveMetrics.get_all_metrics()
        refund_rate = metrics.get("RefundRate", 0)
        
        if refund_rate > 3.0:
            await DecisionQueue.queue_decision(
                agent="CX Agent",
                action_type="UPDATE_FAQ",
                description="Refund rate above 3%. Propose publishing updated sizing chart FAQ to reduce fit issues.",
                confidence=0.92,
                impact=0.4,
                risk=0.1
            )
