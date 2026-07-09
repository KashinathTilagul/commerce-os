"""
EKVAAR OS — Risk Engine

Evaluates business and operational risks based on telemetry signals.
Generates risk alerts and surfaces them to Mission Control.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from core.database import db_run, db_all
from core.telemetry.signal_detection import signal_engine, SignalSeverity

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskCategory(Enum):
    FINANCIAL = "FINANCIAL"
    OPERATIONAL = "OPERATIONAL"
    MARKETING = "MARKETING"
    INVENTORY = "INVENTORY"
    AGENT = "AGENT"
    INFRASTRUCTURE = "INFRASTRUCTURE"


class RiskEngine:
    """
    Proactive risk assessment engine.
    Converts signals into actionable risk assessments.
    Escalates critical risks to Founder.
    """
    
    RISK_WEIGHTS = {
        "revenue": {"weight": 2.5, "category": RiskCategory.FINANCIAL},
        "orders": {"weight": 2.0, "category": RiskCategory.OPERATIONAL},
        "conversion_rate": {"weight": 1.5, "category": RiskCategory.MARKETING},
        "refund_rate": {"weight": 2.0, "category": RiskCategory.OPERATIONAL},
        "cash_position": {"weight": 3.0, "category": RiskCategory.FINANCIAL},
        "inventory_health": {"weight": 1.5, "category": RiskCategory.INVENTORY},
        "decision_queue_depth": {"weight": 0.5, "category": RiskCategory.AGENT},
        "agent_avg_response_time": {"weight": 0.5, "category": RiskCategory.AGENT}
    }
    
    CRITICAL_THRESHOLDS = {
        "cash_position": {"below": 50000, "message": "Cash critically low - immediate attention required"},
        "refund_rate": {"above": 10, "message": "Refund rate unsustainable - product quality issue"},
        "decision_queue_depth": {"above": 20, "message": "Agent execution bottleneck - system stalled"}
    }
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
    
    async def assess_risks(self) -> Dict[str, Any]:
        """
        Run full risk assessment across all metrics and signals.
        
        Returns:
            Comprehensive risk report with all active risks
        """
        detection_results = await signal_engine.run_full_detection_cycle()
        
        all_signals = (
            detection_results["anomalies"] + 
            detection_results["thresholds"] + 
            detection_results["trends"]
        )
        
        risks = []
        
        for signal in all_signals:
            risk = await self._convert_signal_to_risk(signal)
            if risk:
                risks.append(risk)
        
        critical_checks = await self._run_critical_checks()
        risks.extend(critical_checks)
        
        risks.sort(key=lambda x: x.get("score", 0), reverse=True)
        
        for risk in risks:
            await self._persist_risk(risk)
        
        summary = {
            "total_risks": len(risks),
            "critical": sum(1 for r in risks if r["level"] == RiskLevel.CRITICAL.value),
            "high": sum(1 for r in risks if r["level"] == RiskLevel.HIGH.value),
            "medium": sum(1 for r in risks if r["level"] == RiskLevel.MEDIUM.value),
            "low": sum(1 for r in risks if r["level"] == RiskLevel.LOW.value),
            "risks": risks[:10]
        }
        
        if summary["critical"] > 0:
            await self._escalate_critical_risks([r for r in risks if r["level"] == RiskLevel.CRITICAL.value])
        
        logger.info(f"Risk assessment complete: {len(risks)} risks identified")
        
        return summary
    
    async def _convert_signal_to_risk(self, signal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Convert a detected signal into a risk assessment.
        """
        metric_name = signal.get("metric", "unknown")
        
        weight_info = self.RISK_WEIGHTS.get(metric_name.lower())
        if not weight_info:
            return None
        
        weight = weight_info["weight"]
        category = weight_info["category"].value
        
        severity = signal.get("severity", "INFO")
        level = self._severity_to_risk_level(severity)
        if not level:
            return None
        
        base_score = {
            "CRITICAL": 100,
            "HIGH": 75,
            "MEDIUM": 50,
            "LOW": 25
        }.get(level.value, 25)
        
        weighted_score = base_score * weight
        
        risk_id = f"risk_{uuid.uuid4().hex[:16]}"
        
        return {
            "id": risk_id,
            "metric": metric_name,
            "category": category,
            "level": level.value,
            "score": round(weighted_score, 1),
            "message": signal.get("message", f"Risk detected in {metric_name}"),
            "signal_id": signal.get("signal_id"),
            "current_value": signal.get("value") or signal.get("current_value"),
            "detected_at": self._now(),
            "status": "ACTIVE"
        }
    
    async def _run_critical_checks(self) -> List[Dict[str, Any]]:
        """
        Run explicit critical threshold checks.
        """
        risks = []
        
        for metric, threshold_config in self.CRITICAL_THRESHOLDS.items():
            from core.telemetry.telemetry_ingestion import telemetry
            
            latest = await telemetry.get_latest_metrics([metric])
            
            if not latest or metric not in latest:
                continue
            
            current_value = latest[metric]["value"]
            is_critical = False
            
            below = threshold_config.get("below")
            above = threshold_config.get("above")
            
            if below is not None and current_value < below:
                is_critical = True
            elif above is not None and current_value > above:
                is_critical = True
            
            if is_critical:
                risk_id = f"risk_{uuid.uuid4().hex[:16]}"
                weight_info = self.RISK_WEIGHTS.get(metric, {"weight": 1.0, "category": RiskCategory.OPERATIONAL})
                
                risks.append({
                    "id": risk_id,
                    "metric": metric,
                    "category": weight_info["category"].value,
                    "level": RiskLevel.CRITICAL.value,
                    "score": 100 * weight_info["weight"],
                    "message": threshold_config.get("message", f"{metric} critical threshold breached"),
                    "signal_id": None,
                    "current_value": current_value,
                    "detected_at": self._now(),
                    "status": "ACTIVE"
                })
        
        return risks
    
    def _severity_to_risk_level(self, severity: str) -> Optional[RiskLevel]:
        """
        Map signal severity to risk level.
        """
        mapping = {
            "CRITICAL": RiskLevel.CRITICAL,
            "WARNING": RiskLevel.HIGH,
            "INFO": RiskLevel.MEDIUM
        }
        return mapping.get(severity)
    
    async def _persist_risk(self, risk: Dict[str, Any]):
        """
        Save risk to database.
        """
        await db_run(
            """
            INSERT INTO telemetry_risks
            (id, risk_level, category, metric, score, message, current_value, signal_id, detected_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                risk["id"],
                risk["level"],
                risk["category"],
                risk["metric"],
                risk["score"],
                risk["message"],
                risk["current_value"],
                risk.get("signal_id"),
                risk["detected_at"],
                risk["status"]
            ]
        )
    
    async def _escalate_critical_risks(self, critical_risks: List[Dict[str, Any]]):
        """
        Escalate critical risks to Founder inbox and event bus.
        """
        for risk in critical_risks:
            from core.events.bus import event_bus
            from core.events.types import EventType
            
            await event_bus.emit(
                event_type=EventType.ESCALATION,
                source_type="risk_engine",
                source_id=risk["id"],
                actor_id="system",
                payload={
                    "risk_id": risk["id"],
                    "risk_level": risk["level"],
                    "metric": risk["metric"],
                    "message": risk["message"],
                    "current_value": risk["current_value"],
                    "recommended_action": f"Review {risk['metric']} immediately"
                }
            )
            
            logger.critical(f"[RISK ESCALATION] {risk['message']}")
    
    async def get_active_risks(self, hours: int = 24, level: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all active risks from database.
        
        Args:
            hours: How far back to look
            level: Optional filter by level
        
        Returns:
            List of active risks
        """
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        if level:
            rows = await db_all(
                """
                SELECT * FROM telemetry_risks
                WHERE detected_at >= ? AND status = 'ACTIVE' AND risk_level = ?
                ORDER BY score DESC
                """,
                [since, level]
            )
        else:
            rows = await db_all(
                """
                SELECT * FROM telemetry_risks
                WHERE detected_at >= ? AND status = 'ACTIVE'
                ORDER BY score DESC
                """,
                [since]
            )
        
        return [dict(row) for row in rows]
    
    async def resolve_risk(self, risk_id: str, resolved_by: str = "system", resolution: str = ""):
        """
        Mark a risk as resolved.
        """
        now = self._now()
        await db_run(
            """
            UPDATE telemetry_risks 
            SET status = 'RESOLVED', resolved_at = ?, resolved_by = ?, resolution = ?
            WHERE id = ?
            """,
            [now, resolved_by, resolution, risk_id]
        )
        logger.info(f"Risk {risk_id} resolved by {resolved_by}")
    
    async def get_risk_dashboard(self) -> Dict[str, Any]:
        """
        Generate comprehensive risk dashboard data.
        """
        all_risks = await self.get_active_risks(hours=168)
        
        by_category = {}
        for r in all_risks:
            cat = r["category"]
            if cat not in by_category:
                by_category[cat] = {"total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}
            by_category[cat]["total"] += 1
            by_category[cat][r["risk_level"].lower()] += 1
        
        return {
            "summary": {
                "total_active": len(all_risks),
                "critical": sum(1 for r in all_risks if r["risk_level"] == "CRITICAL"),
                "high": sum(1 for r in all_risks if r["risk_level"] == "HIGH"),
                "medium": sum(1 for r in all_risks if r["risk_level"] == "MEDIUM"),
                "low": sum(1 for r in all_risks if r["risk_level"] == "LOW")
            },
            "by_category": by_category,
            "top_risks": sorted(all_risks, key=lambda x: x["score"], reverse=True)[:5]
        }
    
    async def schedule_periodic_assessment(self):
        """
        Register scheduled risk assessment with the automation scheduler.
        """
        from core.automation.scheduler import scheduler
        
        scheduler.schedule_job("risk_assessment", 300, self.assess_risks)
        logger.info("Risk assessment scheduled every 5 minutes")


risk_engine = RiskEngine()
