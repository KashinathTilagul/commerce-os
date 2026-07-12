"""
EKVAAR OS - CEO Engine: Decision Framework Engine
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any

from core.database import db_run
from core.ceo_engine.llm_provider import llm_manager

class CEODecisionEngine:
    SCHEMA = {
        "decision_id": "string",
        "objective": "string",
        "options": ["string"],
        "recommended_option": "string",
        "confidence_score": "integer",
        "risk_score": "integer",
        "impact_score": "integer",
        "approval_level": "string",
        "reasoning": "string",
        "simulation_results": "object",
        "requires_founder": "boolean"
    }

    @staticmethod
    async def evaluate_decision(objective: str, context: str) -> Dict[str, Any]:
        """
        Executes the 8-step cognitive decision framework.
        1. Collect Data -> 2. Identify Objective -> 3. Evaluate Options -> 4. Assess Risk -> 
        5. Estimate Impact -> 6. Recommend Action -> 7. Determine Approval Level -> 8. Execute/Escalate
        """
        # In a production system, we would load the entire founder_profile here to form the system prompt.
        system_prompt = "You are the CEO Decision Engine. Follow the 8-step framework and Founder Twin constraints."
        
        # We delegate to the LLM Abstraction Layer
        payload = await llm_manager.generate_structured(
            system_prompt=system_prompt,
            user_prompt=f"Objective: {objective}\nContext: {context}",
            schema=CEODecisionEngine.SCHEMA
        )

        decision_id = f"ceo_dec_{uuid.uuid4().hex}"
        payload["decision_id"] = decision_id
        
        created_at = datetime.now(timezone.utc).isoformat()

        # Enforce Confidence Routing Rule
        confidence = payload.get("confidence_score", 0)
        if confidence >= 90:
            status = "APPROVED_AUTONOMOUSLY"
            payload["requires_founder"] = False
        elif confidence >= 70:
            status = "PENDING_CEO_APPROVAL"
            payload["requires_founder"] = False
        elif confidence >= 50:
            status = "PENDING_FOUNDER_VISIBILITY"
            payload["requires_founder"] = True
        else:
            status = "PENDING_FOUNDER_DECISION"
            payload["requires_founder"] = True

        # Store Decision
        await db_run(
            """
            INSERT INTO ceo_decisions 
            (id, objective, recommended_option, confidence_score, risk_score, impact_score, approval_level, reasoning, requires_founder, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                decision_id,
                payload.get("objective", objective),
                payload.get("recommended_option", ""),
                payload.get("confidence_score", 0),
                payload.get("risk_score", 0),
                payload.get("impact_score", 0),
                payload.get("approval_level", ""),
                payload.get("reasoning", ""),
                1 if payload["requires_founder"] else 0,
                status,
                created_at
            ]
        )

        # Triggers for Escalation would hook in here if requires_founder is True

        return payload

    @staticmethod
    async def log_trace(decision_id: str, who: str, trace_data: dict, outcome: str) -> str:
        audit_id = f"aud_{uuid.uuid4().hex}"
        await db_run("INSERT INTO ceo_decision_audits (id, decision_id, trace_data_json, who, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?)", [audit_id, decision_id, json.dumps(trace_data), who, outcome, datetime.now(timezone.utc).isoformat()])
        return audit_id

    @staticmethod
    async def store_outcome(decision_id: str, outcome_actual: str, success_score: float, lessons_learned: str) -> str:
        memory_id = f"mem_{uuid.uuid4().hex}"
        await db_run("INSERT INTO ceo_decision_memory (id, decision_id, outcome_actual, success_score, lessons_learned, created_at) VALUES (?, ?, ?, ?, ?, ?)", [memory_id, decision_id, outcome_actual, success_score, lessons_learned, datetime.now(timezone.utc).isoformat()])
        return memory_id

    @staticmethod
    async def execute_review(decision_id: str, is_correct: bool, prediction_accurate: bool, would_repeat: bool, lessons: str) -> str:
        review_id = f"rev_{uuid.uuid4().hex}"
        created_at = datetime.now(timezone.utc).isoformat()
        await db_run("INSERT INTO ceo_decision_reviews (id, decision_id, review_date, is_correct, prediction_accurate, would_repeat, lessons, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [review_id, decision_id, created_at, 1 if is_correct else 0, 1 if prediction_accurate else 0, 1 if would_repeat else 0, lessons, created_at])
        return review_id
