from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class RevenueService:
    @staticmethod
    async def record_daily_revenue(date_str: str, channel: str, amount: float, source: str, created_by: str = "system", notes: str = ""):
        rev_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO daily_revenue (id, date, channel, amount, notes, data_source, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [rev_id, date_str, channel, amount, notes, source, created_by, datetime.now(timezone.utc).isoformat()]
        )
        return rev_id

    @staticmethod
    async def get_recent_revenue(limit: int = 30):
        return await db_all("SELECT * FROM daily_revenue ORDER BY date DESC LIMIT ?", [limit])

    @staticmethod
    async def get_total_revenue():
        row = await db_all("SELECT SUM(amount) as total FROM daily_revenue")
        return row[0]["total"] if row and row[0]["total"] else 0.0

revenue_service = RevenueService()
