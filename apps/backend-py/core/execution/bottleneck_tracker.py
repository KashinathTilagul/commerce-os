class BottleneckTracker:
    @staticmethod
    def detect_bottleneck(metrics):
        # Extremely simplified for seed demonstration
        inventory_health = metrics.get("Inventory Health", 0.9)
        cash_reserves = metrics.get("CashPosition", 1200000)
        traffic = metrics.get("Traffic", 840)
        
        if inventory_health < 0.85:
            return {
                "bottleneck": "Inventory",
                "evidence": "Chalk White Tees below 45 units. Overall stockout rate rising to 4.2%.",
                "impact": "INR 2.4L Lost Revenue over next 14 days",
                "recommended_fix": "Increase core SKU buffers by 30% (Requires INR 40k capital)",
                "confidence": 0.91
            }
        elif traffic < 500:
            return {
                "bottleneck": "Traffic",
                "evidence": "Daily visitors below 500 threshold.",
                "impact": "Top of funnel choking.",
                "recommended_fix": "Increase Meta Ad spend by INR 5k/day",
                "confidence": 0.88
            }
        else:
            return {
                "bottleneck": "Conversion",
                "evidence": "Traffic is stable but conversion rate is lagging at 1.4%.",
                "impact": "Inefficient ROAS.",
                "recommended_fix": "Launch bundle offers to push intent.",
                "confidence": 0.80
            }
