"""
Graph Routes — FastAPI translation of graphRoutes.js
Provides: /export, /health, /metrics, /briefing, /trace
"""

import time
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from core.database import db_all, db_get, db_run

router = APIRouter(prefix="/graph")

# ─── Simple dict caches with 2.5 s TTL ──────────────────────────────────────

_metrics_cache: Dict[str, Any] = {"data": None, "time": 0.0}
_health_cache: Dict[str, Any] = {"data": None, "time": 0.0}
_briefing_cache: Dict[str, Any] = {"data": None, "time": 0.0}

_CACHE_TTL_S = 2.5


def _cache_valid(cache: Dict[str, Any]) -> bool:
    return cache["data"] is not None and (time.time() - cache["time"]) < _CACHE_TTL_S


# ─── GET /export ─────────────────────────────────────────────────────────────

@router.get("/export")
async def export_graph() -> Dict[str, Any]:
    """Full graph export (all entities + relationships)."""
    try:
        entities = await db_all("SELECT * FROM graph_entities")
        relationships = await db_all("SELECT * FROM graph_relationships")
        return {"entities": entities, "relationships": relationships}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /health ─────────────────────────────────────────────────────────────

@router.get("/health")
async def get_health() -> Dict[str, Any]:
    """Graph integrity metrics."""
    global _health_cache
    if _cache_valid(_health_cache):
        return _health_cache["data"]

    try:
        entity_count = (await db_get(
            "SELECT COUNT(*) as count FROM graph_entities"
        ))["count"]

        relationship_count = (await db_get(
            "SELECT COUNT(*) as count FROM graph_relationships"
        ))["count"]

        orphan_count = (await db_get("""
            SELECT COUNT(*) as count FROM graph_entities e
            LEFT JOIN graph_relationships r1 ON e.id = r1.source_entity_id
            LEFT JOIN graph_relationships r2 ON e.id = r2.target_entity_id
            WHERE r1.id IS NULL AND r2.id IS NULL
        """))["count"]

        breakdown_rows = await db_all(
            "SELECT entity_type, COUNT(*) as count FROM graph_entities GROUP BY entity_type"
        )
        entity_breakdown: Dict[str, int] = {
            r["entity_type"]: r["count"] for r in breakdown_rows
        }

        graph_health = (
            ((entity_count - orphan_count) / entity_count) * 100
            if entity_count > 0
            else 0.0
        )

        response = {
            "entityCount": entity_count,
            "relationshipCount": relationship_count,
            "orphanCount": orphan_count,
            "graphHealth": round(graph_health * 100) / 100,
            "entityBreakdown": entity_breakdown,
        }
        _health_cache = {"data": response, "time": time.time()}
        return response

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /metrics ────────────────────────────────────────────────────────────

@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Mission Control metrics (revenue, orders, AOV, returns, top products, missions, tasks)."""
    global _metrics_cache
    if _cache_valid(_metrics_cache):
        return _metrics_cache["data"]

    try:
        # ── Revenue & orders today ──
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_iso = today_start.isoformat()

        revenue_today = (await db_get(
            "SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE created_at >= ?",
            [today_iso],
        ))["total"]

        orders_today = (await db_get(
            "SELECT COUNT(*) as count FROM orders WHERE created_at >= ?",
            [today_iso],
        ))["count"]

        aov = round(revenue_today / orders_today) if orders_today > 0 else 0

        # ── Revenue & orders last 7 days ──
        revenue_7d = (await db_get(
            "SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE created_at >= datetime('now', '-7 days')"
        ))["total"]

        orders_7d = (await db_get(
            "SELECT COUNT(*) as count FROM orders WHERE created_at >= datetime('now', '-7 days')"
        ))["count"]

        # ── Returns ──
        returns_pending = (await db_get(
            "SELECT COUNT(*) as count FROM returns WHERE status = 'PENDING'"
        ))["count"]

        total_returns = (await db_get(
            "SELECT COUNT(*) as count FROM returns"
        ))["count"]

        # ── Inventory decisions (RESTOCK pending) ──
        inventory_decisions = await db_all(
            "SELECT decision_id, title, priority, status, justification, created_at "
            "FROM decisions WHERE decision_type = 'RESTOCK' AND status = 'PENDING' "
            "ORDER BY priority ASC, created_at DESC LIMIT 10"
        )

        # ── Top products (by revenue, last 30 days) ──
        top_products = await db_all("""
            SELECT p.id, p.title, p.vendor,
                   COUNT(oli.id) as order_count,
                   SUM(oli.quantity) as units_sold,
                   SUM(oli.price * oli.quantity) as revenue
            FROM order_line_items oli
            JOIN products p ON oli.product_id = p.id
            JOIN orders o ON oli.order_id = o.id
            WHERE o.created_at >= datetime('now', '-30 days')
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT 10
        """)

        # ── Active missions ──
        active_missions = await db_all(
            "SELECT mission_id, title, objective, status, owner, start_date, end_date "
            "FROM missions WHERE status IN ('PLANNED', 'IN_PROGRESS') "
            "ORDER BY created_at DESC LIMIT 10"
        )

        # ── Open tasks ──
        open_task_rows = await db_all("""
            SELECT task_id, title, description, status, assigned_to, due_date,
                   mission_id, decision_id, agent_id, created_at
            FROM tasks
            WHERE status != 'DONE'
            ORDER BY CASE status WHEN 'BLOCKED' THEN 0 WHEN 'WAITING' THEN 1 ELSE 2 END,
                     due_date ASC, created_at DESC
            LIMIT 25
        """)
        open_tasks = len(open_task_rows)

        # ── Totals ──
        total_customers = (await db_get(
            "SELECT COUNT(*) as count FROM customers"
        ))["count"]
        total_products = (await db_get(
            "SELECT COUNT(*) as count FROM products"
        ))["count"]
        total_variants = (await db_get(
            "SELECT COUNT(*) as count FROM variants"
        ))["count"]

        response = {
            "revenue": {
                "today": revenue_today,
                "last7d": revenue_7d,
                "currency": "INR",
            },
            "orders": {
                "today": orders_today,
                "last7d": orders_7d,
                "aov": aov,
            },
            "returns": {
                "pending": returns_pending,
                "total": total_returns,
            },
            "inventory": {
                "pendingDecisions": len(inventory_decisions),
                "decisions": inventory_decisions,
            },
            "topProducts": top_products,
            "missions": {
                "active": len(active_missions),
                "list": active_missions,
            },
            "tasks": {
                "open": open_tasks,
                "list": open_task_rows,
            },
            "totals": {
                "customers": total_customers,
                "products": total_products,
                "variants": total_variants,
            },
        }
        _metrics_cache = {"data": response, "time": time.time()}
        return response

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /briefing ───────────────────────────────────────────────────────────

@router.get("/briefing")
async def get_briefing() -> Dict[str, Any]:
    """VirtualHQ Founder Briefing."""
    global _briefing_cache
    if _cache_valid(_briefing_cache):
        return _briefing_cache["data"]

    try:
        # ── Health Score components ──
        trends = await db_all("SELECT * FROM trends ORDER BY computed_at DESC")
        trend_map: Dict[str, Any] = {t["trend_type"]: t for t in trends}

        revenue_trend_score = trend_map.get("REVENUE", {}).get("score", 0.5)
        inventory_health_score = trend_map.get("INVENTORY", {}).get("score", 0.5)
        return_rate_score = trend_map.get("RETURN_RATE", {}).get("score", 0.5)
        customer_growth_score = trend_map.get("CUSTOMER_GROWTH", {}).get("score", 0.5)

        # Order velocity (orders last 24 h, normalised to 100/day target)
        orders_last_24h = (await db_get(
            "SELECT COUNT(*) as count FROM orders WHERE created_at >= datetime('now', '-1 day')"
        ))["count"]
        order_velocity_score = min(orders_last_24h / 100, 1.0)

        health_score = round(
            (
                0.30 * revenue_trend_score
                + 0.25 * inventory_health_score
                + 0.20 * return_rate_score
                + 0.15 * customer_growth_score
                + 0.10 * order_velocity_score
            )
            * 100
        ) / 100

        # ── Top 3 decisions ──
        top_decisions = await db_all("""
            SELECT decision_id, title, decision_type, priority, status, justification, created_at
            FROM decisions WHERE status = 'PENDING'
            ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
                     created_at DESC
            LIMIT 3
        """)

        # ── Top 3 risks ──
        risks: List[Dict[str, str]] = []

        # Risk: low-stock SKUs
        low_stock_count = (await db_get("""
            SELECT COUNT(*) as count FROM variants v
            JOIN inventory_policies ip ON v.id = ip.variant_id
            WHERE v.inventory_quantity < ip.threshold
        """))["count"]
        if low_stock_count > 0:
            risks.append({
                "title": f"{low_stock_count} SKU(s) below reorder point",
                "source": "Inventory Policy",
            })

        # Risk: high return rate
        total_orders = (await db_get("SELECT COUNT(*) as count FROM orders"))["count"]
        total_returns = (await db_get("SELECT COUNT(*) as count FROM returns"))["count"]
        return_rate = (total_returns / total_orders * 100) if total_orders > 0 else 0.0
        if return_rate > 3:
            risks.append({
                "title": f"Return rate at {return_rate:.1f}%",
                "source": "Trend (RETURN_RATE)",
            })

        # Risk: declined payments
        declined_orders = (await db_get(
            "SELECT COUNT(*) as count FROM orders WHERE financial_status = 'declined'"
        ))["count"]
        if declined_orders > 0:
            risks.append({
                "title": f"{declined_orders} order(s) with declined payment",
                "source": "Order",
            })

        # ── Top 3 opportunities ──
        opportunities: List[Dict[str, str]] = []

        # Opportunity: top revenue product (7 d)
        top_revenue_product = await db_get("""
            SELECT p.title, SUM(oli.price * oli.quantity) as revenue
            FROM order_line_items oli
            JOIN products p ON oli.product_id = p.id
            JOIN orders o ON oli.order_id = o.id
            WHERE o.created_at >= datetime('now', '-7 days')
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT 1
        """)
        if top_revenue_product:
            opportunities.append({
                "title": (
                    f"{top_revenue_product['title']} trending "
                    f"— ₹{round(top_revenue_product['revenue'])} revenue (7d)"
                ),
                "source": "Trend (REVENUE)",
            })

        # Opportunity: customer count
        new_customer_count = (await db_get(
            "SELECT COUNT(*) as count FROM customers"
        ))["count"]
        if new_customer_count > 0:
            opportunities.append({
                "title": f"{new_customer_count} customers in database",
                "source": "Trend (CUSTOMER_GROWTH)",
            })

        # Opportunity: high-value understocked
        understocked = await db_get("""
            SELECT p.title, v.inventory_quantity, ip.threshold
            FROM variants v
            JOIN products p ON v.product_id = p.id
            JOIN inventory_policies ip ON v.id = ip.variant_id
            WHERE v.inventory_quantity < ip.threshold
            ORDER BY v.price DESC
            LIMIT 1
        """)
        if understocked:
            opportunities.append({
                "title": (
                    f"High-value product \"{understocked['title']}\" understocked "
                    f"({understocked['inventory_quantity']}/{understocked['threshold']})"
                ),
                "source": "Inventory Policy",
            })

        response = {
            "health_score": health_score,
            "health_breakdown": {
                "revenue_trend": revenue_trend_score,
                "inventory_health": inventory_health_score,
                "return_rate": return_rate_score,
                "customer_growth": customer_growth_score,
                "order_velocity": order_velocity_score,
            },
            "top_decisions": top_decisions,
            "top_risks": risks[:3],
            "top_opportunities": opportunities[:3],
            "trends": [
                {
                    "type": t["trend_type"],
                    "score": t["score"],
                    "period": t["period"],
                    "confidence": t["confidence"],
                    "delta": t["delta"],
                }
                for t in trends
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }
        _briefing_cache = {"data": response, "time": time.time()}
        return response

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /trace ──────────────────────────────────────────────────────────────

@router.get("/trace")
async def get_trace() -> Dict[str, Any]:
    """Validation: trace Low Stock → Decision → Mission → Task → Agent."""
    try:
        # Find a P0 RESTOCK decision
        decision = await db_get(
            "SELECT * FROM decisions WHERE decision_type = 'RESTOCK' AND status = 'PENDING' "
            "ORDER BY priority ASC LIMIT 1"
        )

        if not decision:
            return {
                "success": False,
                "message": "No pending RESTOCK decisions found. Run /api/shopify/sync first.",
            }

        # Find the policy that triggered it
        policy = await db_get(
            "SELECT * FROM inventory_policies WHERE policy_id = ?",
            [decision["source_entity_id"]],
        )

        # Find the variant
        variant = (
            await db_get("SELECT * FROM variants WHERE id = ?", [policy["variant_id"]])
            if policy
            else None
        )

        # Find the mission created from this decision
        mission = await db_get(
            "SELECT * FROM missions WHERE decision_id = ?",
            [decision["decision_id"]],
        )

        # Find tasks under this mission
        tasks = (
            await db_all(
                "SELECT * FROM tasks WHERE mission_id = ?", [mission["mission_id"]]
            )
            if mission
            else []
        )

        # Find agents assigned
        agent_ids = list({t["agent_id"] for t in tasks if t.get("agent_id")})
        if agent_ids:
            placeholders = ",".join("?" for _ in agent_ids)
            agents = await db_all(
                f"SELECT * FROM agents WHERE agent_id IN ({placeholders})",
                agent_ids,
            )
        else:
            agents = []

        return {
            "success": True,
            "trace": {
                "step1_variant": (
                    {
                        "id": variant["id"],
                        "sku": variant["sku"],
                        "inventory_quantity": variant["inventory_quantity"],
                        "option1": variant["option1"],
                        "option2": variant["option2"],
                    }
                    if variant
                    else None
                ),
                "step2_policy": (
                    {
                        "id": policy["policy_id"],
                        "type": policy["type"],
                        "threshold": policy["threshold"],
                    }
                    if policy
                    else None
                ),
                "step3_decision": {
                    "id": decision["decision_id"],
                    "title": decision["title"],
                    "type": decision["decision_type"],
                    "priority": decision["priority"],
                    "status": decision["status"],
                },
                "step4_mission": (
                    {
                        "id": mission["mission_id"],
                        "title": mission["title"],
                        "objective": mission["objective"],
                        "status": mission["status"],
                    }
                    if mission
                    else None
                ),
                "step5_tasks": [
                    {
                        "id": t["task_id"],
                        "title": t["title"],
                        "status": t["status"],
                        "assigned_to": t["assigned_to"],
                    }
                    for t in tasks
                ],
                "step6_agents": [
                    {
                        "id": a["agent_id"],
                        "name": a["name"],
                        "capability": a["capability"],
                        "status": a["status"],
                    }
                    for a in agents
                ],
            },
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
