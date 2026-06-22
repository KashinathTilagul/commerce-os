import asyncio
from core.database import init_db
from core.execution.execution_engine import ExecutionEngine
from core.execution.accountability_engine import AccountabilityEngine
from core.execution.mission_tracker import MissionTracker
from core.execution.founder_inbox import FounderInbox
import json

async def run_omega():
    print("--- INITIALIZING MISSION OMEGA: EXECUTION ACCOUNTABILITY ---")
    await init_db()
    
    print("\n1. Loading Real Execution Tree...")
    await ExecutionEngine.load_seed_data()
    print("   [SUCCESS] Objectives, Projects, and Tasks loaded into database.")
    
    print("\n2. Running Accountability Engine...")
    audit = await AccountabilityEngine.run_audit()
    print(f"   Execution Score: {audit['execution_score']}/100")
    for alert in audit['alerts']:
        print(f"   ! {alert}")
        
    print("\n3. Tracking Mission Revenue Impact...")
    revenue_data = await MissionTracker.track_revenue_impact()
    print(f"   Realized Revenue: INR {revenue_data['realized_revenue']}")
    print(f"   At-Risk Revenue: INR {revenue_data['at_risk_revenue']} (Blocked/Overdue)")
    
    print("\n4. Generating Founder Inbox & Bottlenecks...")
    metrics_mock = {"Inventory Health": 0.82, "Traffic": 840, "CashPosition": 1200000}
    inbox = FounderInbox.generate_inbox(metrics_mock)
    
    print("\n--- OMEGA SUCCESS TEST: The 5 Questions ---")
    print(f"1. Highest leverage action?    -> {inbox['top_opportunity']}")
    print(f"2. Current bottleneck?         -> {inbox['bottleneck']['bottleneck']} ({inbox['bottleneck']['impact']})")
    print(f"3. What failed/is behind?      -> {len(inbox['overdue_tasks'])} overdue, {len(inbox['blocked_projects'])} blocked.")
    print(f"4. Needs Founder approval?     -> {inbox['most_important_decision']}")
    print(f"5. Next INR 1L revenue action?    -> Clear blockers on: {', '.join([t['title'] for t in inbox['top_3_revenue_tasks']])}")

if __name__ == "__main__":
    asyncio.run(run_omega())
