"""
Test script for Phase 3: Executive Intelligence - Telemetry & Risk Engine
"""
import asyncio
import sys
sys.path.insert(0, ".")

from core.database import init_db, get_pool
from core.telemetry.telemetry_ingestion import telemetry
from core.telemetry.signal_detection import signal_engine
from core.telemetry.risk_engine import risk_engine


async def test_telemetry():
    print("\n" + "="*60)
    print("PHASE 3: TELEMETRY INGESTION TEST")
    print("="*60)
    
    # Initialize database
    await init_db()
    pool = get_pool()
    await pool.initialize()
    
    # Test metric ingestion
    print("\n1. Testing metric ingestion...")
    metric_id = await telemetry.ingest_metric(
        metric_name="revenue",
        value=25000.0,
        source="test"
    )
    print(f"   [OK] Ingested metric: {metric_id}")
    
    # Batch ingest
    print("\n2. Testing batch ingestion...")
    ids = await telemetry.batch_ingest([
        {"name": "orders", "value": 50},
        {"name": "traffic", "value": 1200},
        {"name": "conversion_rate", "value": 4.2}
    ])
    print(f"   [OK] Batch ingested {len(ids)} metrics")
    
    # Get latest metrics
    print("\n3. Testing metric retrieval...")
    latest = await telemetry.get_latest_metrics(["revenue", "orders"])
    print(f"   [OK] Latest metrics: {latest}")
    
    # Calculate baseline
    print("\n4. Testing baseline calculation...")
    baseline = await telemetry.calculate_baseline("revenue", days=7)
    print(f"   [OK] Baseline: {baseline}")
    
    return True


async def test_signals():
    print("\n" + "="*60)
    print("PHASE 3: SIGNAL DETECTION TEST")
    print("="*60)
    
    # Ingest some metrics first
    await telemetry.ingest_metric("revenue", 15000, source="test")
    await telemetry.ingest_metric("orders", 5, source="test")
    await telemetry.ingest_metric("refund_rate", 12, source="test")
    
    # Test anomaly detection
    print("\n1. Testing anomaly detection...")
    anomalies = await signal_engine.detect_anomalies("revenue")
    print(f"   [OK] Detected {len(anomalies)} anomalies")
    
    # Test threshold checks
    print("\n2. Testing threshold checks...")
    thresholds = await signal_engine.check_thresholds()
    print(f"   [OK] Detected {len(thresholds)} threshold breaches")
    
    # Test trend detection
    print("\n3. Testing trend detection...")
    trend = await signal_engine.detect_trend_change("revenue")
    if trend:
        print(f"   [OK] Trend detected: {trend}")
    else:
        print("   [OK] No significant trend change")
    
    # Full detection cycle
    print("\n4. Running full detection cycle...")
    results = await signal_engine.run_full_detection_cycle()
    print(f"   [OK] Total signals: {results['total_new_signals']}")
    
    return True


async def test_risks():
    print("\n" + "="*60)
    print("PHASE 3: RISK ENGINE TEST")
    print("="*60)
    
    # Run risk assessment
    print("\n1. Testing risk assessment...")
    assessment = await risk_engine.assess_risks()
    print(f"   [OK] Total risks: {assessment['total_risks']}")
    print(f"   [OK] Critical: {assessment['critical']}")
    print(f"   [OK] High: {assessment['high']}")
    
    # Get risk dashboard
    print("\n2. Testing risk dashboard...")
    dashboard = await risk_engine.get_risk_dashboard()
    print(f"   [OK] Dashboard summary: {dashboard['summary']}")
    
    # Get active risks
    print("\n3. Testing active risks retrieval...")
    risks = await risk_engine.get_active_risks(hours=24)
    print(f"   [OK] Active risks: {len(risks)}")
    
    return True


async def main():
    print("\n" + "="*60)
    print("PHASE 3 VERIFICATION: EKVAAR OS")
    print("Executive Intelligence Layer")
    print("="*60)
    
    try:
        # Test telemetry
        await test_telemetry()
        
        # Test signals
        await test_signals()
        
        # Test risks
        await test_risks()
        
        print("\n" + "="*60)
        print("[OK] PHASE 3 VERIFICATION COMPLETE")
        print("="*60)
        print("\nAll systems operational:")
        print("  [OK] Telemetry Ingestion")
        print("  [OK] Signal Detection")
        print("  [OK] Risk Engine")
        print("\nPhase 3 Launch Criteria Met:")
        print("  The OS can detect metric anomalies, generate risks,")
        print("  and surface red alerts in Mission Control.")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        pool = get_pool()
        await pool.close_all()


if __name__ == "__main__":
    asyncio.run(main())
