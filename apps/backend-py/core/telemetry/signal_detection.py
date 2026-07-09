"""
EKVAAR OS — Signal Detection Engine

Detects meaningful signals and anomalies in telemetry data.
Flags events that require attention based on configurable thresholds.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from core.database import db_run, db_all
from core.telemetry.telemetry_ingestion import telemetry

logger = logging.getLogger(__name__)


class SignalSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class SignalType(Enum):
    ANOMALY = "ANOMALY"
    THRESHOLD_BREACH = "THRESHOLD_BREACH"
    TREND_CHANGE = "TREND_CHANGE"
    CUSTOM = "CUSTOM"


class SignalDetectionEngine:
    """
    Monitors telemetry data and detects signals that require attention.
    Uses statistical baselines and configurable rules.
    """
    
    DEFAULT_THRESHOLD_RULES = {
        "revenue": {"low": {"absolute": 10000, "percentage": -20}, "high": {"percentage": 50}},
        "orders": {"low": {"absolute": 5, "percentage": -30}, "high": {}},
        "conversion_rate": {"low": {"absolute": 0.5, "percentage": -25}, "high": {}},
        "refund_rate": {"low": {}, "high": {"absolute": 5}},
        "cash_position": {"low": {"absolute": 100000}, "high": {}},
        "decision_queue_depth": {"low": {}, "high": {"absolute": 10}},
        "agent_avg_response_time": {"low": {}, "high": {"absolute": 300}}
    }
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
    
    async def detect_anomalies(
        self,
        metric_name: str,
        std_deviations: float = 2.0,
        lookback_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Detect statistical anomalies for a metric.
        
        Args:
            metric_name: Name of the metric to check
            std_deviations: Number of std devs to consider anomalous
            lookback_hours: How far back to look for baseline
        
        Returns:
            List of detected anomalies
        """
        history = await telemetry.get_metric_history(metric_name, hours=lookback_hours)
        
        if len(history) < 5:
            return []
        
        values = [h["value"] for h in history]
        n = len(values)
        mean = sum(values) / n
        variance = sum((x - mean) ** 2 for x in values) / n
        std_dev = variance ** 0.5
        
        if std_dev == 0:
            return []
        
        anomalies = []
        
        latest = history[0]
        z_score = (latest["value"] - mean) / std_dev
        
        if abs(z_score) > std_deviations:
            signal_id = f"sig_{uuid.uuid4().hex[:16]}"
            severity = SignalSeverity.CRITICAL if abs(z_score) > 3 else SignalSeverity.WARNING
            
            await self._record_signal(
                signal_id=signal_id,
                signal_type=SignalType.ANOMALY,
                metric_name=metric_name,
                current_value=latest["value"],
                baseline_value=mean,
                deviation=z_score,
                severity=severity,
                message=f"{metric_name} anomaly detected: {latest['value']} (baseline: {round(mean, 2)}, z-score: {round(z_score, 2)})"
            )
            
            anomalies.append({
                "signal_id": signal_id,
                "metric": metric_name,
                "value": latest["value"],
                "baseline": mean,
                "z_score": z_score,
                "severity": severity.value
            })
        
        return anomalies
    
    async def check_thresholds(self) -> List[Dict[str, Any]]:
        """
        Check all metrics against configured thresholds.
        
        Returns:
            List of threshold breach signals
        """
        latest_metrics = await telemetry.get_latest_metrics()
        signals = []
        
        for metric_name, metric_data in latest_metrics.items():
            rules = self.DEFAULT_THRESHOLD_RULES.get(metric_name.lower(), {})
            current_value = metric_data["value"]
            
            low_rules = rules.get("low", {})
            high_rules = rules.get("high", {})
            
            if self._check_low_threshold(current_value, low_rules, metric_name):
                signal_id = f"sig_{uuid.uuid4().hex[:16]}"
                await self._record_signal(
                    signal_id=signal_id,
                    signal_type=SignalType.THRESHOLD_BREACH,
                    metric_name=metric_name,
                    current_value=current_value,
                    baseline_value=low_rules.get("absolute", 0),
                    deviation=None,
                    severity=SignalSeverity.WARNING,
                    message=f"{metric_name} below threshold: {current_value}"
                )
                signals.append({
                    "signal_id": signal_id,
                    "metric": metric_name,
                    "type": "LOW",
                    "value": current_value,
                    "threshold": low_rules.get("absolute", "N/A")
                })
            
            if self._check_high_threshold(current_value, high_rules, metric_name):
                signal_id = f"sig_{uuid.uuid4().hex[:16]}"
                await self._record_signal(
                    signal_id=signal_id,
                    signal_type=SignalType.THRESHOLD_BREACH,
                    metric_name=metric_name,
                    current_value=current_value,
                    baseline_value=high_rules.get("absolute", 0),
                    deviation=None,
                    severity=SignalSeverity.WARNING,
                    message=f"{metric_name} above threshold: {current_value}"
                )
                signals.append({
                    "signal_id": signal_id,
                    "metric": metric_name,
                    "type": "HIGH",
                    "value": current_value,
                    "threshold": high_rules.get("absolute", "N/A")
                })
        
        return signals
    
    def _check_low_threshold(self, value: float, rules: Dict, metric_name: str) -> bool:
        if not rules:
            return False
        
        absolute = rules.get("absolute")
        if absolute is not None and value < absolute:
            return True
        
        return False
    
    def _check_high_threshold(self, value: float, rules: Dict, metric_name: str) -> bool:
        if not rules:
            return False
        
        absolute = rules.get("absolute")
        if absolute is not None and value > absolute:
            return True
        
        return False
    
    async def detect_trend_change(
        self,
        metric_name: str,
        window_hours: int = 12,
        min_change_pct: float = 20.0
    ) -> Optional[Dict[str, Any]]:
        """
        Detect significant trend changes in a metric.
        
        Args:
            metric_name: Metric to analyze
            window_hours: Time window for comparison
            min_change_pct: Minimum percentage change to flag
        
        Returns:
            Trend change signal if detected
        """
        history = await telemetry.get_metric_history(metric_name, hours=window_hours * 2)
        
        if len(history) < 10:
            return None
        
        mid = len(history) // 2
        recent = history[:mid]
        older = history[mid:]
        
        recent_avg = sum(h["value"] for h in recent) / len(recent)
        older_avg = sum(h["value"] for h in older) / len(older)
        
        if older_avg == 0:
            return None
        
        change_pct = ((recent_avg - older_avg) / older_avg) * 100
        
        if abs(change_pct) >= min_change_pct:
            signal_id = f"sig_{uuid.uuid4().hex[:16]}"
            direction = "increasing" if change_pct > 0 else "decreasing"
            
            await self._record_signal(
                signal_id=signal_id,
                signal_type=SignalType.TREND_CHANGE,
                metric_name=metric_name,
                current_value=recent_avg,
                baseline_value=older_avg,
                deviation=change_pct,
                severity=SignalSeverity.WARNING if abs(change_pct) > 30 else SignalSeverity.INFO,
                message=f"{metric_name} trending {direction}: {round(change_pct, 1)}% change"
            )
            
            return {
                "signal_id": signal_id,
                "metric": metric_name,
                "direction": direction,
                "change_pct": round(change_pct, 1),
                "recent_avg": round(recent_avg, 2),
                "older_avg": round(older_avg, 2)
            }
        
        return None
    
    async def _record_signal(
        self,
        signal_id: str,
        signal_type: SignalType,
        metric_name: str,
        current_value: float,
        baseline_value: float,
        deviation: Optional[float],
        severity: SignalSeverity,
        message: str
    ):
        """
        Record a detected signal in the database.
        """
        now = self._now()
        
        await db_run(
            """
            INSERT INTO telemetry_signals 
            (id, signal_type, metric_name, current_value, baseline_value, deviation, severity, message, detected_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
            """,
            [signal_id, signal_type.value, metric_name, current_value, baseline_value, deviation or 0, severity.value, message, now]
        )
        
        logger.warning(f"Signal detected: {message}")
    
    async def get_recent_signals(self, hours: int = 24, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent signals from the database.
        
        Args:
            hours: How far back to look
            severity: Optional severity filter
        
        Returns:
            List of signals
        """
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        if severity:
            rows = await db_all(
                """
                SELECT * FROM telemetry_signals 
                WHERE detected_at >= ? AND severity = ?
                ORDER BY detected_at DESC
                """,
                [since, severity]
            )
        else:
            rows = await db_all(
                """
                SELECT * FROM telemetry_signals 
                WHERE detected_at >= ?
                ORDER BY detected_at DESC
                """,
                [since]
            )
        
        return [dict(row) for row in rows]
    
    async def acknowledge_signal(self, signal_id: str, acknowledged_by: str = "system"):
        """
        Mark a signal as acknowledged.
        """
        now = self._now()
        await db_run(
            "UPDATE telemetry_signals SET status = 'ACKNOWLEDGED', acknowledged_at = ? WHERE id = ?",
            [now, signal_id]
        )
        logger.info(f"Signal {signal_id} acknowledged by {acknowledged_by}")
    
    async def run_full_detection_cycle(self) -> Dict[str, Any]:
        """
        Run all detection methods and return summary.
        
        Returns:
            Summary of all detected signals
        """
        results = {
            "anomalies": [],
            "thresholds": [],
            "trends": [],
            "total_new_signals": 0
        }
        
        for metric in ["revenue", "orders", "conversion_rate", "refund_rate"]:
            anomalies = await self.detect_anomalies(metric)
            results["anomalies"].extend(anomalies)
        
        threshold_signals = await self.check_thresholds()
        results["thresholds"] = threshold_signals
        
        for metric in ["revenue", "traffic", "conversion_rate"]:
            trend = await self.detect_trend_change(metric)
            if trend:
                results["trends"].append(trend)
        
        total = len(results["anomalies"]) + len(results["thresholds"]) + len(results["trends"])
        results["total_new_signals"] = total
        
        logger.info(f"Detection cycle complete: {total} signals detected")
        
        return results


signal_engine = SignalDetectionEngine()
