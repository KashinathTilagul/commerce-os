from core.reality_integration.product_db import ProductDB
from core.approval_engine.decision_queue import DecisionQueue

class ProductAgent:
    @staticmethod
    async def analyze_and_propose():
        low_inv = await ProductDB.get_low_inventory(20)
        for p in low_inv:
            if p["status"] == "LIVE":
                await DecisionQueue.queue_decision(
                    agent="Product Agent",
                    action_type="RESTOCK",
                    description=f"Initiate production run for {p['name']} ({p['sku']}). Only {p['inventory']} left.",
                    confidence=0.96, # High confidence, might auto-approve if risk low
                    impact=0.6,
                    risk=0.1
                )
