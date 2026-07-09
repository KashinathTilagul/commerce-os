"""
EKVAAR OS — Telemetry Ingestion System

Ingests real-time metrics from multiple sources: database, external APIs, agents.
Stores time-series data for anomaly detection and risk analysis.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from core.database import db_run, db_all

logger = logging.getLogger(__name__)


class TelemetryIngestion:
    """
    Central telemetry ingestion engine.
    Collects, normalizes, and stores metrics from all system sources.
    """
    
    METRIC_TYPES = {
        "revenue": "financial",
        "orders": "operational",
        "traffic": "growth",
        "conversion_rate": "growth",
        "aov": "financial",
        "cac": "financial",
        "roas": "marketing",
        "cash_position": "financial",
        "refund_rate": "operational",
        "inventory_health": "operational",
        "agent_tasks_completed": "agent",
        "agent_avg_response_time": "agent",
        "system_cpu": "infrastructure",
        "system_memory": "infrastructure",
        "decision_queue_depth": "system"
    }
    
    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
    
    @staticmethod
    def _to_float(value: Any) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
    
    async def ingest_metric(
        self,
        metric_name: str,
        value: float,
        source: str = "manual",
        tags: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Ingest a single metric data point.
        
        Args:
            metric_name: Name of the metric (e.g., 'revenue', 'orders')
            value: Numeric value of the metric
            source: Source system (e.g., 'shopify', 'agent', 'manual')
            tags: Optional tags for filtering (e.g., {'channel': 'organic'})
            metadata: Optional additional metadata
        
        Returns:
            The metric datapoint ID
        """
        datapoint_id = f"tel_{uuid.uuid4().hex[:16]}"
        now = self._now()
        
        metric_type = self.METRIC_TYPES.get(metric_name.lower(), "general")
        
        tags_json = "{}" if not tags else str(tags).replace("'", '"')
        metadata_json = "{}" if not metadata else str(metadata).replace("'", '"')
        
        await db_run(
            """
            INSERT INTO telemetry_metrics 
            (id, metric_name, metric_type, value, source, tags, metadata, ingested_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [datapoint_id, metric_name, metric_type, self._to_float(value), source, tags_json, metadata_json, now]
        )
        
        await db_run(
            """
            INSERT INTO telemetry_metric_history 
            (id, metric_name, metric_type, value, source, tags, metadata, ingested_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [f"hist_{uuid.uuid4().hex[:16]}", metric_name, metric_type, self._to_float(value), source, tags_json, metadata_json, now]
        )
        
        logger.info(f"Ingested metric: {metric_name}={value} from {source}")
        
        return datapoint_id
    
    async def batch_ingest(self, metrics: List[Dict[str, Any]]) -> List[str]:
        """
        Batch ingest multiple metrics at once.
        
        Args:
            metrics: List of metric dicts with keys: name, value, source, tags, metadata
        
        Returns:
            List of ingested datapoint IDs
        """
        ids = []
        for m in metrics:
            metric_id = await self.ingest_metric(
                metric_name=m.get("name", "unknown"),
                value=m.get("value", 0),
                source=m.get("source", "batch"),
                tags=m.get("tags"),
                metadata=m.get("metadata")
            )
            ids.append(metric_id)
        return ids
    
    async def get_latest_metrics(self, metric_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get the latest values for metrics.
        
        Args:
            metric_names: Optional list of specific metric names to retrieve
        
        Returns:
            Dict mapping metric_name to {value, timestamp, source}
        """
        if metric_names:
            placeholders = ",".join(["?" for _ in metric_names])
            rows = await db_all(
                f"""
                SELECT metric_name, value, source, ingested_at 
                FROM telemetry_metrics 
                WHERE metric_name IN ({placeholders})
                """,
                metric_names
            )
        else:
            rows = await db_all(
                """
                SELECT metric_name, value, source, ingested_at 
                FROM telemetry_metrics
                """
            )
        
        return {
            r["metric_name"]: {
                "value": r["value"],
                "timestamp": r["ingested_at"],
                "source": r["source"]
            }
            for r in rows
        }
    
    async def get_metric_history(
        self,
        metric_name: str,
        hours: int = 24,
        tags: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get historical values for a specific metric.
        
        Args:
            metric_name: Name of the metric
            hours: Number of hours to look back
            tags: Optional tag filter
        
        Returns:
            List of datapoints with value, timestamp
        """
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        rows = await db_all(
            """
            SELECT value, source, ingested_at 
            FROM telemetry_metric_history 
            WHERE metric_name = ? AND ingested_at >= ?
            ORDER BY ingested_at DESC
            """,
            [metric_name, since]
        )
        
        return [
            {
                "value": r["value"],
                "source": r["source"],
                "timestamp": r["ingested_at"]
            }
            for r in rows
        ]
    
    async def calculate_baseline(self, metric_name: str, days: int = 7) -> Dict[str, float]:
        """
        Calculate statistical baseline for a metric over past N days.
        
        Returns:
            Dict with mean, std_dev, min, max, count
        """
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        rows = await db_all(
            """
            SELECT value 
            FROM telemetry_metric_history 
            WHERE metric_name = ? AND ingested_at >= ?
            """,
            [metric_name, since]
        )
        
        if not rows:
            return {"mean": 0.0, "std_dev": 0.0, "min": 0.0, "max": 0.0, "count": 0}
        
        values = [r["value"] for r in rows]
        n = len(values)
        mean = sum(values) / n
        variance = sum((x - mean) ** 2 for x in values) / n if n > 1 else 0
        std_dev = variance ** 0.5
        
        return {
            "mean": round(mean, 2),
            "std_dev": round(std_dev, 2),
            "min": min(values),
            "max": max(values),
            "count": n
        }
    
    async def ingest_from_live_metrics(self) -> int:
        """
        Pull current values from production_live_metrics and ingest into telemetry.
        
        Returns:
            Number of metrics ingested
        """
        rows = await db_all("SELECT metric_name, value FROM production_live_metrics")
        
        count = 0
        for r in rows:
            await self.ingest_metric(
                metric_name=r["metric_name"],
                value=r["value"],
                source="production_live"
            )
            count += 1
        
        logger.info(f"Ingested {count} metrics from production_live_metrics")
        return count
    
    async def ingest_agent_metrics(self) -> int:
        """
        Calculate and ingest agent-related metrics.
        
        Returns:
            Number of metrics ingested
        """
        completed_tasks = await db_all(
            "SELECT COUNT(*) as count FROM runs WHERE status = 'completed'"
        )
        
        avg_response_rows = await db_all(
            """
            SELECT AVG(julianday(completed_at) - julianday(started_at)) * 86400 as avg_seconds
            FROM runs 
            WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
            """
        )
        
        pending_approvals = await db_all(
            "SELECT COUNT(*) as count FROM approval_queue WHERE status = 'PENDING'"
        )
        
        completed_count = completed_tasks[0]["count"] if completed_tasks else 0
        avg_response = avg_response_rows[0]["avg_seconds"] if avg_response_rows and avg_response_rows[0]["avg_seconds"] else 0
        pending_count = pending_approvals[0]["count"] if pending_approvals else 0
        
        await self.ingest_metric("agent_tasks_completed", completed_count, source="agent_runtime")
        await self.ingest_metric("agent_avg_response_time", round(avg_response, 2), source="agent_runtime")
        await self.ingest_metric("decision_queue_depth", pending_count, source="system")
        
        return 3


telemetry = TelemetryIngestion()
