import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all

class DecisionQueue:
    @staticmethod
    async def queue_decision(agent: str, action_type: str, description: str, confidence: float, impact: float, risk: float):
        # CONFIDENCE-BASED AUTO-APPROVAL
        if confidence >= 0.95 and risk < 0.2:
            status = "AUTO_APPROVED"
        else:
            status = "PENDING"
            
        dec_id = f"dec_{uuid.uuid4().hex}"
        await db_run(
            """
            INSERT INTO production_decision_queue 
            (id, agent, action_type, description, confidence, impact, risk, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [dec_id, agent, action_type, description, confidence, impact, risk, status, datetime.now(timezone.utc).isoformat()]
        )
        return {"id": dec_id, "status": status}

    @staticmethod
    async def get_pending_decisions():
        # Ranked by Impact / Risk ratio
        rows = await db_all("SELECT * FROM production_decision_queue WHERE status = 'PENDING'")
        # Sort in python for simplicity
        def sort_key(row):
            r = row["risk"] if row["risk"] > 0 else 0.01
            return row["impact"] / r
        
        rows.sort(key=sort_key, reverse=True)
        return rows

    @staticmethod
    async def update_decision_status(dec_id: str, status: str):
        await db_run("UPDATE production_decision_queue SET status = ? WHERE id = ?", [status, dec_id])
        return {"id": dec_id, "new_status": status}

    @staticmethod
    async def seed_initial_queue():
        await db_run("DELETE FROM production_decision_queue")
        await DecisionQueue.queue_decision(
            "Product Agent", "LAUNCH_PRODUCT", "Launch Cargo Pants CP-UT-OLV", 0.92, 0.8, 0.3
        )
        await DecisionQueue.queue_decision(
            "Marketing Agent", "SPEND", "Increase FB Ad Spend by ₹20k/day", 0.85, 0.6, 0.5
        )
