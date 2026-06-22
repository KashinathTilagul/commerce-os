"""
EKVAAR OS - Mission Zero: Trust Ledger
"""
import uuid
from datetime import datetime, timezone
from core.database import db_run, db_get

class TrustLedger:
    @staticmethod
    async def record_trust_event(employee_id: str, action_type: str, result: str, points: float) -> None:
        """
        Action Types: RECOMMENDATION, ESCALATION, DECISION
        Result: SUCCESS, FAILED
        Points can be negative (e.g., -5.0 for a failed escalation).
        """
        ledger_id = f"trst_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        
        await db_run(
            """
            INSERT INTO mz_trust_ledger (id, employee_id, action_type, result, points, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [ledger_id, employee_id, action_type, result, points, now]
        )
        
        # Update executive scorecard directly
        await db_run(
            """
            INSERT INTO mz_executive_scorecards (id, employee_id, metric_name, score, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET score = score + excluded.score, updated_at = excluded.updated_at
            """,
            [f"score_{employee_id}_trust", employee_id, "TRUST_SCORE", points, now]
        )

    @staticmethod
    async def get_trust_score(employee_id: str) -> float:
        row = await db_get("SELECT SUM(points) as total FROM mz_trust_ledger WHERE employee_id = ?", [employee_id])
        return row["total"] if row and row["total"] else 0.0
