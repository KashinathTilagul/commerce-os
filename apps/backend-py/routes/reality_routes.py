from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from core.database import db_run, db_all
from core.services import revenue_service, order_service, inventory_service, cash_service

router = APIRouter(prefix="/reality")

class AuditLogEntry(BaseModel):
    user: str
    action: str
    entity: str
    old_value: str
    new_value: str
    source: str

async def log_audit(entry: AuditLogEntry):
    await db_run(
        "INSERT INTO reality_audit_log (id, timestamp, user, action, entity, old_value, new_value, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            uuid.uuid4().hex,
            datetime.now(timezone.utc).isoformat(),
            entry.user,
            entry.action,
            entry.entity,
            entry.old_value,
            entry.new_value,
            entry.source
        ]
    )

class RevenuePayload(BaseModel):
    date: str
    channel: str
    amount: float
    notes: Optional[str] = ""
    data_source: str
    created_by: str

@router.post("/revenue")
async def add_revenue(payload: RevenuePayload):
    await revenue_service.record_daily_revenue(
        payload.date, payload.channel, payload.amount, payload.data_source, payload.created_by, payload.notes
    )
    await log_audit(AuditLogEntry(
        user=payload.created_by, action="CREATE", entity="daily_revenue", old_value="", new_value=str(payload.amount), source=payload.data_source
    ))
    return {"status": "success"}

@router.get("/revenue")
async def get_revenue():
    return await revenue_service.get_recent_revenue(100)

class OrderPayload(BaseModel):
    date: str
    channel: str
    orders: int
    notes: Optional[str] = ""
    data_source: str
    created_by: str

@router.post("/orders")
async def add_orders(payload: OrderPayload):
    await order_service.record_daily_orders(
        payload.date, payload.channel, payload.orders, payload.data_source, payload.created_by, payload.notes
    )
    await log_audit(AuditLogEntry(
        user=payload.created_by, action="CREATE", entity="daily_orders", old_value="", new_value=str(payload.orders), source=payload.data_source
    ))
    return {"status": "success"}

@router.get("/orders")
async def get_orders():
    return await order_service.get_recent_orders(100)

class InventoryPayload(BaseModel):
    sku: str
    product_name: str
    quantity: int
    data_source: str
    created_by: str

@router.post("/inventory")
async def set_inventory(payload: InventoryPayload):
    await inventory_service.update_inventory(
        payload.sku, payload.product_name, payload.quantity, payload.data_source
    )
    await log_audit(AuditLogEntry(
        user=payload.created_by, action="UPDATE", entity=f"inventory:{payload.sku}", old_value="0", new_value=str(payload.quantity), source=payload.data_source
    ))
    return {"status": "success"}

@router.get("/inventory")
async def get_inventory():
    return await inventory_service.get_inventory()

class CashPayload(BaseModel):
    date: str
    cash_available: float
    notes: Optional[str] = ""
    data_source: str
    updated_by: str

@router.post("/cash")
async def set_cash(payload: CashPayload):
    await cash_service.update_cash_position(
        payload.date, payload.cash_available, payload.data_source, payload.updated_by, payload.notes
    )
    await log_audit(AuditLogEntry(
        user=payload.updated_by, action="CREATE", entity="cash_position", old_value="", new_value=str(payload.cash_available), source=payload.data_source
    ))
    return {"status": "success"}

@router.get("/cash")
async def get_cash():
    return await cash_service.get_cash_history(100)

class ExpensePayload(BaseModel):
    date: str
    category: str
    amount: float
    description: Optional[str] = ""
    data_source: str
    created_by: str

@router.post("/expenses")
async def add_expense(payload: ExpensePayload):
    await db_run(
        "INSERT INTO expenses (id, date, category, amount, description, data_source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [uuid.uuid4().hex, payload.date, payload.category, payload.amount, payload.description, payload.data_source, datetime.now(timezone.utc).isoformat()]
    )
    await log_audit(AuditLogEntry(
        user=payload.created_by, action="CREATE", entity="expenses", old_value="", new_value=str(payload.amount), source=payload.data_source
    ))
    return {"status": "success"}

@router.get("/expenses")
async def get_expenses():
    return await db_all("SELECT * FROM expenses ORDER BY date DESC LIMIT 100")

from core.source_registry import get_metric_confidence, get_all_sources_health

@router.get("/sources")
async def get_sources():
    return await get_all_sources_health()

@router.get("/dashboard")
async def get_dashboard():
    # Aggregates metrics for the BoardRoom
    revenue = await revenue_service.get_recent_revenue(30)
    orders = await order_service.get_recent_orders(30)
    cash = await cash_service.get_current_cash()
    expenses = await db_all("SELECT SUM(amount) as total, MAX(data_source) as data_source FROM expenses")
    
    inventory_items = await inventory_service.get_inventory()
    total_qty = sum(item["quantity"] for item in inventory_items) if inventory_items else 0
    inv_source = inventory_items[0]["data_source"] if inventory_items else "UNVERIFIED"
    inventory = [{"total_qty": total_qty, "data_source": inv_source}]


    rev_yesterday = revenue[0] if revenue else {"amount": 0, "data_source": "UNVERIFIED"}
    rev_this_month = sum(r["amount"] for r in revenue)
    ord_yesterday = orders[0] if orders else {"orders": 0, "data_source": "UNVERIFIED"}
    
    rev_conf = await get_metric_confidence("revenue", rev_yesterday["data_source"] if revenue else "UNVERIFIED")
    ord_conf = await get_metric_confidence("orders", ord_yesterday["data_source"] if orders else "UNVERIFIED")
    cash_conf = await get_metric_confidence("cash_position", cash["data_source"] if cash else "UNVERIFIED")
    exp_conf = await get_metric_confidence("expenses", expenses[0]["data_source"] if expenses and expenses[0]["data_source"] else "UNVERIFIED")
    inv_conf = await get_metric_confidence("inventory", inventory[0]["data_source"] if inventory and inventory[0]["data_source"] else "UNVERIFIED")

    return {
        "revenue": {
            "yesterday": rev_yesterday["amount"],
            "this_month": rev_this_month,
            "status": rev_conf["status"],
            "freshness": rev_conf["freshness"]
        },
        "orders": {
            "yesterday": ord_yesterday["orders"],
            "status": ord_conf["status"],
            "freshness": ord_conf["freshness"]
        },
        "cash": {
            "available": cash["cash_available"] if cash else 0,
            "status": cash_conf["status"],
            "freshness": cash_conf["freshness"]
        },
        "expenses": {
            "this_month": expenses[0]["total"] if expenses and expenses[0]["total"] else 0,
            "status": exp_conf["status"],
            "freshness": exp_conf["freshness"]
        },
        "inventory": {
            "health": inventory[0]["total_qty"] if inventory and inventory[0]["total_qty"] else 0,
            "status": inv_conf["status"],
            "freshness": inv_conf["freshness"]
        },
        "execution": {
            "score": 0,
            "status": "UNVERIFIED",
            "bottleneck": "UNVERIFIED"
        }
    }
