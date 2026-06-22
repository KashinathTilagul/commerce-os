"""
Shopify Routes — Stub for the Shopify sync endpoint.
The full Shopify integration will be reimplemented once
the decision engine is ported to Python.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/shopify")


@router.post("/sync")
async def shopify_sync():
    """Placeholder for the Shopify sync endpoint."""
    return {
        "success": True,
        "message": "Shopify sync endpoint migrated to Python. Full integration pending.",
        "counts": {
            "products": 0,
            "variants": 0,
            "collections": 0,
            "customers": 0,
            "orders": 0,
            "returns": 0,
            "inventory_events": 0,
            "suppliers": 0,
            "total_records": 0,
        },
    }


@router.post("/credentials")
async def save_credentials():
    """Placeholder for saving Shopify credentials."""
    return {"success": True, "message": "Credential storage migrated to Python. Implementation pending."}
