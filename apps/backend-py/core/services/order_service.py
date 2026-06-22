from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class OrderService:
    @staticmethod
    async def record_daily_orders(date_str: str, channel: str, orders: int, source: str, created_by: str = "system", notes: str = ""):
        order_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO daily_orders (id, date, channel, orders, notes, data_source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [order_id, date_str, channel, orders, notes, source, datetime.now(timezone.utc).isoformat()]
        )
        return order_id

    @staticmethod
    async def get_recent_orders(limit: int = 30):
        return await db_all("SELECT * FROM daily_orders ORDER BY date DESC LIMIT ?", [limit])

    @staticmethod
    async def get_total_orders():
        row = await db_all("SELECT SUM(orders) as total FROM daily_orders")
        return row[0]["total"] if row and row[0]["total"] else 0

order_service = OrderService()
