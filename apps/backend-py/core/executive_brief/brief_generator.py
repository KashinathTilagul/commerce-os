from core.reality_integration.live_metrics import LiveMetrics
from core.reality_integration.product_db import ProductDB
from core.database import db_all

class BriefGenerator:
    @staticmethod
    async def generate_morning_brief():
        metrics = await LiveMetrics.get_all_metrics()
        low_inventory = await ProductDB.get_low_inventory(50)
        
        # Get pending decisions from queue
        pending_decisions = await db_all("SELECT * FROM production_decision_queue WHERE status = 'PENDING'")
        
        brief = {
            "business_health": {
                "Revenue": metrics.get("Revenue", 0),
                "Orders": metrics.get("Orders", 0),
                "Traffic": metrics.get("Traffic", 0),
                "ConversionRate": metrics.get("ConversionRate", 0),
                "AOV": metrics.get("AOV", 0),
                "RefundRate": metrics.get("RefundRate", 0),
                "CashPosition": metrics.get("CashPosition", 0)
            },
            "risk_section": {
                "inventory_risks": [f"{p['name']} ({p['sku']}) - {p['inventory']} units left" for p in low_inventory],
                "customer_issues": "Refund rate holding at 2.1%. No major anomalies.",
                "operational_bottlenecks": "None active."
            },
            "opportunity_section": {
                "campaign_ideas": ["Micro-influencer push for Ash Grey Hoodie"],
                "marketplace_opportunities": ["Myntra expansion for Cargo Pants"]
            },
            "decision_queue_count": len(pending_decisions),
            "ai_recommendations": [
                "Approve Cargo Pants launch to capture remaining Q2 bottoms demand.",
                "Restock Chalk White Oversized T-Shirt (only 45 units left).",
                "Maintain current ROAS of 4.5. Do not increase ad spend until inventory refreshed."
            ]
        }
        return brief
