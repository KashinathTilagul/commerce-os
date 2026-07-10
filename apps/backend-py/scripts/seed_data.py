"""Seed database with real data"""
import asyncio
from core.database import db_run, init_db, get_pool

async def seed():
    await init_db()
    pool = get_pool()
    await pool.initialize()
    
    metrics = [
        ('Revenue', 24500.0),
        ('Orders', 48),
        ('Traffic', 1250),
        ('ConversionRate', 3.84),
        ('AOV', 510.0),
        ('CAC', 380.0),
        ('ROAS', 4.2),
        ('CashPosition', 850000.0),
        ('RefundRate', 2.1)
    ]
    for name, val in metrics:
        await db_run(
            "INSERT INTO production_live_metrics (id, metric_name, value, timestamp) VALUES (?, ?, ?, datetime('now'))",
            [f"m_{name.lower()}", name, val]
        )
    
    tasks = [
        ("task_001", "Phase 3 Risk Engine", "IN_PROGRESS", "CEO"),
        ("task_002", "Deploy to Production", "PENDING", "CTO"),
        ("task_003", "Q1 Revenue Target", "BLOCKED", "CMO"),
        ("task_004", "Brand Guidelines Update", "COMPLETED", "Brand"),
        ("task_005", "Customer Support Automation", "PENDING", "COO"),
    ]
    for tid, title, status, owner in tasks:
        await db_run(
            "INSERT INTO omega_tasks (id, title, status, owner, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
            [tid, title, status, owner]
        )
    
    approvals = [
        ("appr_001", "Budget Approval: Marketing Q1", "APPROVAL", "PENDING", "CRITICAL"),
        ("appr_002", "Hire: Senior Developer", "HIRING", "PENDING", "HIGH"),
        ("appr_003", "Campaign: Summer Launch", "CAMPAIGN", "APPROVED", "MEDIUM"),
    ]
    for aid, title, cat, status, priority in approvals:
        await db_run(
            "INSERT INTO system_approvals (id, title, category, status, priority, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
            [aid, title, cat, status, priority]
        )
    
    print("Database seeded with real data")
    await pool.close_all()

if __name__ == "__main__":
    asyncio.run(seed())
