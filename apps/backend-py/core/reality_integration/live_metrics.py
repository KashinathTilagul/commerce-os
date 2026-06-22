import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all

class LiveMetrics:
    @staticmethod
    async def update_metric(metric_name: str, value: float):
        # We store latest value per metric
        # First, delete existing to keep it simple "latest state"
        await db_run("DELETE FROM production_live_metrics WHERE metric_name = ?", [metric_name])
        await db_run(
            "INSERT INTO production_live_metrics (id, metric_name, value, timestamp) VALUES (?, ?, ?, ?)",
            [f"metric_{uuid.uuid4().hex}", metric_name, value, datetime.now(timezone.utc).isoformat()]
        )

    @staticmethod
    async def get_all_metrics():
        rows = await db_all("SELECT metric_name, value FROM production_live_metrics")
        return {r["metric_name"]: r["value"] for r in rows}

    @staticmethod
    async def seed_initial_metrics():
        await db_run("DELETE FROM production_live_metrics")
        metrics = {
            "Revenue": 24500.0,
            "Orders": 12.0,
            "Traffic": 840.0,
            "ConversionRate": 1.4,
            "AOV": 2041.0,
            "CAC": 450.0,
            "ROAS": 4.5,
            "CashPosition": 1200000.0,
            "RefundRate": 2.1
        }
        for k, v in metrics.items():
            await LiveMetrics.update_metric(k, v)
