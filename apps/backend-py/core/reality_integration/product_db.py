import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all

class ProductDB:
    @staticmethod
    async def add_product(name: str, sku: str, category: str, color: str, pricing: float, inventory: int, status: str):
        prod_id = f"prod_{uuid.uuid4().hex}"
        await db_run(
            "INSERT INTO production_products (id, name, sku, category, color, pricing, inventory, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [prod_id, name, sku, category, color, pricing, inventory, status, datetime.now(timezone.utc).isoformat()]
        )
        return prod_id

    @staticmethod
    async def get_all_products():
        return await db_all("SELECT * FROM production_products")
        
    @staticmethod
    async def get_low_inventory(threshold: int = 50):
        return await db_all("SELECT * FROM production_products WHERE inventory < ?", [threshold])

    @staticmethod
    async def seed_initial_products():
        await db_run("DELETE FROM production_products")
        prods = [
            ("Oversized T-Shirt", "TS-OS-BLK", "T-Shirt", "Obsidian Black", 1999.0, 120, "LIVE"),
            ("Oversized T-Shirt", "TS-OS-WHT", "T-Shirt", "Chalk White", 1999.0, 45, "LIVE"),
            ("Heavyweight Hoodie", "HD-HW-GRY", "Hoodie", "Ash Grey", 3499.0, 15, "LIVE"),
            ("Cargo Pants", "CP-UT-OLV", "Bottoms", "Olive Drab", 4999.0, 0, "DRAFT")
        ]
        for name, sku, cat, col, pr, inv, st in prods:
            await ProductDB.add_product(name, sku, cat, col, pr, inv, st)
