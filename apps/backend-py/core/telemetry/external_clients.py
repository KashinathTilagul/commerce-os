"""
EKVAAR OS — External Telemetry Clients

Clients for ingesting telemetry from external data sources:
- Shopify
- Google Analytics
- Custom webhooks
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from core.telemetry.telemetry_ingestion import telemetry
from core.database import db_all

logger = logging.getLogger(__name__)


class ExternalTelemetryClient:
    """Base class for external telemetry integrations."""
    
    async def fetch_and_ingest(self) -> int:
        """Fetch data from external source and ingest into telemetry."""
        raise NotImplementedError


class ShopifyTelemetryClient(ExternalTelemetryClient):
    """Ingest metrics from Shopify."""
    
    async def fetch_and_ingest(self) -> int:
        """Pull Shopify metrics from database and ingest."""
        try:
            revenue_rows = await db_all(
                "SELECT SUM(amount) as total FROM daily_revenue WHERE date >= date('now', '-1 day')"
            )
            total_revenue = revenue_rows[0]["total"] if revenue_rows else 0
            
            order_rows = await db_all(
                "SELECT SUM(orders) as total FROM daily_orders WHERE date >= date('now', '-1 day')"
            )
            total_orders = order_rows[0]["total"] if order_rows else 0
            
            await telemetry.ingest_metric("shopify_revenue", total_revenue or 0, source="shopify")
            await telemetry.ingest_metric("shopify_orders", total_orders or 0, source="shopify")
            
            logger.info("Ingested Shopify metrics")
            return 2
            
        except Exception as e:
            logger.error(f"Failed to ingest Shopify metrics: {e}")
            return 0


class SystemTelemetryClient(ExternalTelemetryClient):
    """Ingest system and infrastructure metrics."""
    
    async def fetch_and_ingest(self) -> int:
        """Calculate and ingest system metrics."""
        try:
            from core.database import db_all
            import asyncio
            
            task_rows = await db_all(
                "SELECT COUNT(*) as count FROM omega_tasks WHERE status = 'COMPLETED'"
            )
            completed_tasks = task_rows[0]["count"] if task_rows else 0
            
            objective_rows = await db_all(
                "SELECT COUNT(*) as count FROM omega_objectives WHERE status = 'active'"
            )
            active_objectives = objective_rows[0]["count"] if objective_rows else 0
            
            blocked_rows = await db_all(
                "SELECT COUNT(*) as count FROM omega_tasks WHERE status = 'BLOCKED'"
            )
            blocked_tasks = blocked_rows[0]["count"] if blocked_rows else 0
            
            await telemetry.ingest_metric("tasks_completed", completed_tasks, source="system")
            await telemetry.ingest_metric("objectives_active", active_objectives, source="system")
            await telemetry.ingest_metric("tasks_blocked", blocked_tasks, source="system")
            
            return 3
            
        except Exception as e:
            logger.error(f"Failed to ingest system metrics: {e}")
            return 0


class WebhookTelemetryReceiver:
    """Receive and process webhook-based telemetry."""
    
    async def process_webhook(self, source: str, payload: Dict[str, Any]) -> bool:
        """
        Process incoming webhook telemetry.
        
        Args:
            source: Source identifier (e.g., 'custom_dashboard')
            payload: Dict containing metric data
        
        Returns:
            Success status
        """
        try:
            metrics = payload.get("metrics", [])
            
            if not metrics:
                if "metric_name" in payload and "value" in payload:
                    metrics = [payload]
            
            count = 0
            for m in metrics:
                await telemetry.ingest_metric(
                    metric_name=m.get("name") or m.get("metric_name"),
                    value=m.get("value"),
                    source=source,
                    tags=m.get("tags"),
                    metadata=m.get("metadata")
                )
                count += 1
            
            logger.info(f"Processed {count} metrics from webhook: {source}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to process webhook: {e}")
            return False


class TelemetryAggregator:
    """Aggregates all telemetry sources."""
    
    def __init__(self):
        self.clients = [
            ShopifyTelemetryClient(),
            SystemTelemetryClient()
        ]
        self.webhook_receiver = WebhookTelemetryReceiver()
    
    async def aggregate_all(self) -> Dict[str, int]:
        """Run all telemetry clients and return counts."""
        results = {}
        
        for client in self.clients:
            client_name = client.__class__.__name__
            count = await client.fetch_and_ingest()
            results[client_name] = count
        
        await telemetry.ingest_agent_metrics()
        results["agent_metrics"] = 3
        
        total = sum(results.values())
        logger.info(f"Telemetry aggregation complete: {total} metrics ingested")
        
        return results


telemetry_aggregator = TelemetryAggregator()
