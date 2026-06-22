"""
Source Registry - Async dynamic engine for Data Source Verification.
"""

from datetime import datetime, timezone, timedelta
from core.database import db_all

# Baseline static registry definitions
SOURCE_DEFINITIONS = {
    "Shopify": {
        "type": "API",
        "metrics": ["revenue", "orders", "inventory"]
    },
    "Amazon": {
        "type": "API",
        "metrics": ["revenue", "orders"]
    },
    "Flipkart": {
        "type": "API",
        "metrics": ["revenue", "orders"]
    },
    "Cash": {
        "type": "MANUAL",
        "metrics": ["cash_position"]
    },
    "Accounting": {
        "type": "MANUAL",
        "metrics": ["expenses"]
    }
}

async def _calculate_freshness(source: str, is_manual: bool, metric: str = None) -> str:
    """Calculate freshness string e.g., '2h ago', '4 days ago'."""
    last_dt = None
    
    if not is_manual:
        # Check sync log for API sources
        rows = await db_all(
            "SELECT completed_at FROM sync_log WHERE source_system = ? AND status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1", 
            [source]
        )
        if rows and rows[0]["completed_at"]:
            try:
                last_dt = datetime.fromisoformat(rows[0]["completed_at"])
            except:
                pass
    else:
        # Manual sources freshness from actual tables
        if source == "Cash":
            rows = await db_all("SELECT updated_at FROM cash_position ORDER BY updated_at DESC LIMIT 1")
            if rows and rows[0]["updated_at"]:
                last_dt = datetime.fromisoformat(rows[0]["updated_at"])
        elif source == "Accounting":
            # For expenses we might use max created_at, but we didn't add updated_at to expenses in schema? Let's check date
            rows = await db_all("SELECT date FROM expenses ORDER BY date DESC LIMIT 1")
            if rows and rows[0]["date"]:
                # date is YYYY-MM-DD
                last_dt = datetime.strptime(rows[0]["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                
    if not last_dt:
        return "Never"
        
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness
    if last_dt.tzinfo is None:
        last_dt = last_dt.replace(tzinfo=timezone.utc)
        
    diff = now - last_dt
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        return f"{int(seconds // 60)}m ago"
    elif seconds < 86400:
        return f"{int(seconds // 3600)}h ago"
    else:
        return f"{int(seconds // 86400)} days ago"

async def get_source_health(source: str) -> dict:
    """
    Returns the comprehensive verification status, sync history, and auth status for a source.
    """
    definition = SOURCE_DEFINITIONS.get(source)
    if not definition:
        return None
        
    is_manual = definition["type"] == "MANUAL"
    
    # Sync History
    syncs = await db_all("SELECT status, records_processed, completed_at, error_message FROM sync_log WHERE source_system = ? ORDER BY started_at DESC", [source])
    
    total_syncs = len(syncs)
    successful_syncs = len([s for s in syncs if s["status"] == "COMPLETED"])
    failed_syncs = len([s for s in syncs if s["status"] == "FAILED"])
    success_rate = int((successful_syncs / total_syncs * 100)) if total_syncs > 0 else 0
    
    last_sync = syncs[0] if syncs else None
    last_successful = next((s for s in syncs if s["status"] == "COMPLETED"), None)
    
    auth_status = "N/A"
    status = "INTEGRATION_READY"
    confidence_level = 0
    records_ingested = sum(s["records_processed"] for s in syncs if s["records_processed"])
    
    if is_manual:
        status = "MANUAL"
        auth_status = "Manual Entry"
        confidence_level = 20 if source == "Cash" else 10
    else:
        # Determine Auth Status and Overall Status from logs
        if total_syncs == 0:
            status = "INTEGRATION_READY"
            auth_status = "Pending Validation"
        else:
            if last_sync["status"] == "FAILED":
                status = "FAILED"
                if "credentials" in str(last_sync["error_message"]).lower() or "auth" in str(last_sync["error_message"]).lower() or "token" in str(last_sync["error_message"]).lower():
                    auth_status = "Missing/Invalid Credentials"
                else:
                    auth_status = "Connection Error"
            else:
                auth_status = "Valid"
                
                # Verify Strict Requirements: Auth Success + Records > 0 + DB Writes > 0 + < 24 Hours
                if last_successful and last_successful["records_processed"] > 0:
                    last_dt = datetime.fromisoformat(last_successful["completed_at"])
                    if last_dt.tzinfo is None: last_dt = last_dt.replace(tzinfo=timezone.utc)
                    if (datetime.now(timezone.utc) - last_dt).total_seconds() < 86400:
                        status = "VERIFIED"
                        confidence_level = 100
                    else:
                        status = "STALE"
                        confidence_level = 50
                else:
                    status = "FAILED"
                    auth_status = "No Records Processed"
    
    freshness = await _calculate_freshness(source, is_manual)
    
    return {
        "source": source,
        "type": definition["type"],
        "status": status,
        "auth_status": auth_status,
        "sync_health": f"{success_rate}%",
        "last_sync_time": freshness,
        "records_ingested": records_ingested,
        "confidence_level": confidence_level,
        "history": {
            "total": total_syncs,
            "successful": successful_syncs,
            "failed": failed_syncs,
            "last_successful_at": last_successful["completed_at"] if last_successful else None
        }
    }

async def get_all_sources_health():
    results = []
    for source in SOURCE_DEFINITIONS.keys():
        results.append(await get_source_health(source))
    return results

async def get_metric_confidence(metric_name: str, data_source: str) -> dict:
    """
    Returns the explicitly configured confidence and status for a given metric and source, dynamically computed.
    """
    if data_source == "UNVERIFIED" or not data_source:
        return {"confidence": 0, "status": "UNVERIFIED", "freshness": "Never"}
        
    # Manual data entry
    if data_source == "MANUAL":
        # Assume it's cash or expenses based on metric_name
        src = "Cash" if metric_name == "cash_position" else "Accounting" if metric_name == "expenses" else "MANUAL"
        fresh = await _calculate_freshness(src, True)
        return {"confidence": 35, "status": "MANUAL", "freshness": fresh}

    # API Source Data
    health = await get_source_health(data_source)
    if not health:
        return {"confidence": 0, "status": "UNVERIFIED", "freshness": "Never"}
        
    # Adjust individual metric confidence based on the source's dynamic confidence
    conf = health["confidence_level"]
    status = health["status"]
    
    # Inventory from Shopify is always Partial because warehouse is unknown
    if metric_name == "inventory" and data_source == "Shopify" and status == "VERIFIED":
        conf = 70
        status = "PARTIAL"
        
    return {
        "confidence": conf,
        "status": status,
        "freshness": health["last_sync_time"]
    }
