from core.reality_integration.live_metrics import LiveMetrics
from core.approval_engine.decision_queue import DecisionQueue

class FinanceAgent:
    @staticmethod
    async def analyze_and_propose():
        metrics = await LiveMetrics.get_all_metrics()
        cash = metrics.get("CashPosition", 0)
        
        if cash < 500000:
            await DecisionQueue.queue_decision(
                agent="Finance Agent",
                action_type="FREEZE_SPEND",
                description="Cash position below ₹5L. Freeze all non-essential marketing spend immediately.",
                confidence=0.99,
                impact=0.9,
                risk=0.1
            )
