from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class CashService:
    @staticmethod
    async def update_cash_position(date_str: str, amount: float, source: str, updated_by: str = "system", notes: str = ""):
        cash_id = str(uuid.uuid4())
        await db_run(
            """
            INSERT INTO cash_position (id, date, cash_available, notes, data_source, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [cash_id, date_str, amount, notes, source, updated_by, datetime.now(timezone.utc).isoformat()]
        )
        return cash_id

    @staticmethod
    async def get_current_cash():
        rows = await db_all("SELECT * FROM cash_position ORDER BY date DESC LIMIT 1")
        return rows[0] if rows else None

    @staticmethod
    async def get_cash_history(limit: int = 30):
        return await db_all("SELECT * FROM cash_position ORDER BY date DESC LIMIT ?", [limit])

cash_service = CashService()
