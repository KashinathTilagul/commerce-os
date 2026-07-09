"""
EKVAAR OS — Telemetry API Routes

REST API endpoints for the telemetry, signal, and risk systems.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from core.telemetry.telemetry_ingestion import telemetry
from core.telemetry.signal_detection import signal_engine
from core.telemetry.risk_engine import risk_engine

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.post("/ingest")
async def ingest_metric(
    metric_name: str,
    value: float,
    source: str = "manual",
    tags: Optional[Dict[str, str]] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """Ingest a single metric data point."""
    datapoint_id = await telemetry.ingest_metric(
        metric_name=metric_name,
        value=value,
        source=source,
        tags=tags,
        metadata=metadata
    )
    return {"status": "success", "datapoint_id": datapoint_id}


@router.post("/ingest/batch")
async def batch_ingest(metrics: List[Dict[str, Any]]):
    """Batch ingest multiple metrics."""
    ids = await telemetry.batch_ingest(metrics)
    return {"status": "success", "count": len(ids), "ids": ids}


@router.post("/ingest/from-live-metrics")
async def ingest_from_live_metrics():
    """Pull values from production_live_metrics into telemetry."""
    count = await telemetry.ingest_from_live_metrics()
    return {"status": "success", "metrics_ingested": count}


@router.post("/ingest/agent-metrics")
async def ingest_agent_metrics():
    """Calculate and ingest agent runtime metrics."""
    count = await telemetry.ingest_agent_metrics()
    return {"status": "success", "metrics_ingested": count}


@router.get("/metrics")
async def get_latest_metrics(metric_names: Optional[str] = None):
    """Get latest metric values."""
    names_list = metric_names.split(",") if metric_names else None
    metrics = await telemetry.get_latest_metrics(names_list)
    return {"metrics": metrics}


@router.get("/metrics/{metric_name}/history")
async def get_metric_history(
    metric_name: str,
    hours: int = Query(24, ge=1, le=168)
):
    """Get historical values for a metric."""
    history = await telemetry.get_metric_history(metric_name, hours=hours)
    return {"metric": metric_name, "history": history}


@router.get("/metrics/{metric_name}/baseline")
async def get_metric_baseline(
    metric_name: str,
    days: int = Query(7, ge=1, le=30)
):
    """Get statistical baseline for a metric."""
    baseline = await telemetry.calculate_baseline(metric_name, days=days)
    return {"metric": metric_name, "baseline": baseline}


@router.post("/signals/detect")
async def run_detection():
    """Run full signal detection cycle."""
    results = await signal_engine.run_full_detection_cycle()
    return {"status": "success", "results": results}


@router.get("/signals")
async def get_recent_signals(
    hours: int = Query(24, ge=1, le=168),
    severity: Optional[str] = None
):
    """Get recent detected signals."""
    signals = await signal_engine.get_recent_signals(hours=hours, severity=severity)
    return {"signals": signals}


@router.post("/signals/{signal_id}/acknowledge")
async def acknowledge_signal(signal_id: str):
    """Acknowledge a signal."""
    await signal_engine.acknowledge_signal(signal_id)
    return {"status": "success", "signal_id": signal_id}


@router.post("/risks/assess")
async def assess_risks():
    """Run full risk assessment."""
    results = await risk_engine.assess_risks()
    return {"status": "success", "assessment": results}


@router.get("/risks")
async def get_active_risks(
    hours: int = Query(24, ge=1, le=168),
    level: Optional[str] = None
):
    """Get active risks."""
    risks = await risk_engine.get_active_risks(hours=hours, level=level)
    return {"risks": risks}


@router.get("/risks/dashboard")
async def get_risk_dashboard():
    """Get risk dashboard summary."""
    dashboard = await risk_engine.get_risk_dashboard()
    return dashboard


@router.post("/risks/{risk_id}/resolve")
async def resolve_risk(
    risk_id: str,
    resolution: str = ""
):
    """Mark a risk as resolved."""
    await risk_engine.resolve_risk(risk_id, resolved_by="api", resolution=resolution)
    return {"status": "success", "risk_id": risk_id}


@router.post("/schedule/telemetry-ingestion")
async def schedule_telemetry_ingestion():
    """Schedule periodic telemetry ingestion."""
    from core.automation.scheduler import scheduler
    
    async def run_ingestion():
        await telemetry.ingest_from_live_metrics()
        await telemetry.ingest_agent_metrics()
    
    scheduler.schedule_job("telemetry_ingestion", 60, run_ingestion)
    return {"status": "success", "message": "Telemetry ingestion scheduled every 60s"}


@router.post("/schedule/risk-assessment")
async def schedule_risk_assessment():
    """Schedule periodic risk assessment."""
    await risk_engine.schedule_periodic_assessment()
    return {"status": "success", "message": "Risk assessment scheduled every 5 minutes"}
