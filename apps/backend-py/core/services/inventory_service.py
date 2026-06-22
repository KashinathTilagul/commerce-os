from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all, db_get

class InventoryService:
    @staticmethod
    async def update_inventory(sku: str, product_name: str, quantity: int, source: str):
        inv_id = str(uuid.uuid4())
        existing = await db_all("SELECT * FROM inventory WHERE sku = ?", [sku])
        
        if existing:
            await db_run(
                "UPDATE inventory SET quantity = ?, data_source = ?, last_updated = ? WHERE sku = ?", 
                [quantity, source, datetime.now(timezone.utc).isoformat(), sku]
            )
        else:
            await db_run(
                "INSERT INTO inventory (id, sku, product_name, quantity, data_source, last_updated) VALUES (?, ?, ?, ?, ?, ?)",
                [inv_id, sku, product_name, quantity, source, datetime.now(timezone.utc).isoformat()]
            )

    @staticmethod
    async def get_inventory():
        return await db_all("SELECT * FROM inventory ORDER BY last_updated DESC")

    @staticmethod
    async def get_low_inventory(threshold: int = 20):
        return await db_all("SELECT * FROM inventory WHERE quantity < ? ORDER BY quantity ASC", [threshold])

inventory_service = InventoryService()
