from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all

class InventoryService:
    @staticmethod
    async def update_inventory(sku: str, product_name: str, quantity: int, source: str):
        existing = await db_all("SELECT id FROM inventory WHERE sku = ?", [sku])
        if existing:
            await db_run(
                "UPDATE inventory SET product_name = ?, quantity = ?, data_source = ?, last_updated = ? WHERE sku = ?",
                [product_name, quantity, source, datetime.now(timezone.utc).isoformat(), sku]
            )
        else:
            await db_run(
                """
                INSERT INTO inventory (id, sku, product_name, quantity, data_source, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [str(uuid.uuid4()), sku, product_name, quantity, source, datetime.now(timezone.utc).isoformat()]
            )

    @staticmethod
    async def get_inventory():
        return await db_all("SELECT * FROM inventory ORDER BY sku")

    @staticmethod
    async def get_inventory_by_sku(sku: str):
        return await db_all("SELECT * FROM inventory WHERE sku = ?", [sku])

inventory_service = InventoryService()
