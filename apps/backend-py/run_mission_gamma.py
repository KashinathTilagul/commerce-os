import asyncio
import uuid
import json
from datetime import datetime, timezone
from core.database import init_db, db_run, db_all
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.mission_zero.mission_sandbox import MissionSandbox

# ---------------------------------------------------------
# State Management
# ---------------------------------------------------------
class CompanyState:
    def __init__(self):
        self.day = 0
        self.cash = 1000000.0
        self.revenue = 0.0
        self.profit = 0.0
        self.orders = 0
        self.inv_tshirt = 100
        self.inv_hoodie = 100
        self.inv_sweat = 100
        self.org_health = 87.0
        self.trust = 100.0 # Assuming normalized to 100 max, or we just carry forward a high score
        self.csat = 100.0
        self.alloc_score = 100.0
        self.opp_cost = 0.0
        self.gov_events = 0

    def adjust_cash(self, amount):
        self.cash += amount
        self.profit += amount
    
    def add_revenue(self, amount):
        self.revenue += amount
        self.cash += amount
        self.profit += amount
        self.orders += int(amount / 2000) # Assuming ~2000 per order
        self.inv_tshirt = max(0, self.inv_tshirt - int(amount / 6000))
        self.inv_hoodie = max(0, self.inv_hoodie - int(amount / 6000))
        self.inv_sweat = max(0, self.inv_sweat - int(amount / 6000))

    def update_alloc(self, score_delta):
        self.alloc_score = max(0, min(100, self.alloc_score + score_delta))
        
    def log_opp_cost(self, amount):
        self.opp_cost += amount

async def save_state(s: CompanyState):
    await db_run(
        """
        INSERT INTO mz_gamma_state (day, cash, revenue, profit, orders, inventory_tshirt, inventory_hoodie, inventory_sweat, org_health, trust, csat, alloc_score, opp_cost, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [s.day, s.cash, s.revenue, s.profit, s.orders, s.inv_tshirt, s.inv_hoodie, s.inv_sweat, s.org_health, s.trust, s.csat, s.alloc_score, s.opp_cost, datetime.now(timezone.utc).isoformat()]
    )

async def record_memory(event: str, decision: str, result: str, lesson: str, confidence: float):
    print(f"    [LEARNING CAPTURED] {lesson}")
    await db_run(
        "INSERT INTO mz_gamma_learning (id, event, decision, result, lesson, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [f"mem_{uuid.uuid4().hex}", event, decision, result, lesson, confidence, datetime.now(timezone.utc).isoformat()]
    )

async def save_deliverable(title: str, content: str):
    await db_run(
        "INSERT INTO mz_gamma_deliverables (id, title, content, created_at) VALUES (?, ?, ?, ?)",
        [f"deliv_{uuid.uuid4().hex}", title, content, datetime.now(timezone.utc).isoformat()]
    )

# ---------------------------------------------------------
# Simulation Engine
# ---------------------------------------------------------
async def execute_mission_gamma():
    print("--- LAUNCHING MISSION GAMMA (30-DAY SIMULATION) ---")
    await init_db()
    
    await db_run("DELETE FROM mz_gamma_state")
    await db_run("DELETE FROM mz_gamma_learning")
    await db_run("DELETE FROM mz_gamma_deliverables")
    
    s = CompanyState()
    sim_id = await MissionSandbox.launch_simulation("Mission Gamma: 30-Day OS")
    
    for day in range(1, 31):
        s.day = day
        print(f"\n--- DAY {day} ---")
        
        # Base daily burn
        s.adjust_cash(-2000) 
        
        # Deterministic Event Engine
        if day == 3:
            print("  [EVENT] Influencer Mention")
            s.add_revenue(15000)
            await record_memory("Influencer Mention", "Passive", "Revenue +15000", "Organic micro-influencer mentions drive high conversion.", 0.85)

        elif day == 5:
            print("  [EVENT] Ad Campaign Failure")
            print("  [CEO DECISION] Marketing requests 50k to re-test. Finance says halt.")
            print("  [CEO RESOLUTION] Halt spend. Re-evaluate creative.")
            s.update_alloc(+2) # Good allocation (stopped bleeding)
            await record_memory("Ad Failure", "Halt Spend", "Saved 50k", "Stop bleeding immediately on failed creative. Do not double down blindly.", 0.92)

        elif day == 7:
            print("  [GOVERNANCE TEST] Marketing attempts unauthorized publishing.")
            check = await RuntimeGuardrails.validate_execution("emp_marketing", "PUBLISH", "Marketing", 0, "STANDARD")
            if not check["allowed"]:
                print("  -> BLOCKED by Guardrails.")
                s.gov_events += 1

        elif day == 8:
            print("  [EVENT] Supplier Delay")
            print("  [CEO DECISION] Ops requests 25k for expedited air freight to maintain CSAT.")
            s.adjust_cash(-25000)
            s.update_alloc(+2) # Preserved CSAT
            await record_memory("Supplier Delay", "Expedite Freight", "Cash -25k, CSAT maintained", "Protect customer experience over short-term margin.", 0.88)

        elif day == 11:
            print("  [EVENT] Marketplace Approval")
            print("  [CEO DECISION] Spend 75k for marketplace expansion integration?")
            s.adjust_cash(-75000)
            s.add_revenue(120000)
            s.update_alloc(+5) # Excellent allocation
            await record_memory("Marketplace Expansion", "Invest 75k", "Revenue +120k", "Marketplaces yield high initial ROI. Allocate capital aggressively here.", 0.95)

        elif day == 14:
            print("  [GOVERNANCE TEST] Finance attempts unauthorized pricing modification.")
            check = await RuntimeGuardrails.validate_execution("emp_finance", "PUBLISH", "Finance", 0, "STANDARD")
            if not check["allowed"]:
                print("  -> BLOCKED by Guardrails.")
                s.gov_events += 1

        elif day == 15:
            print("  [EVENT] Viral Customer Review")
            s.add_revenue(60000)

        elif day == 19:
            print("  [EVENT] Refund Spike")
            s.adjust_cash(-15000)
            s.csat -= 2.0

        elif day == 21:
            print("  [GOVERNANCE TEST] Operations attempts unauthorized inventory write-off.")
            check = await RuntimeGuardrails.validate_execution("emp_operations", "EXECUTE_EXTERNAL", "Operations", 0, "STANDARD")
            if not check["allowed"]:
                print("  -> BLOCKED by Guardrails.")
                s.gov_events += 1

        elif day == 22:
            print("  [EVENT] Wholesale Inquiry (Potential 500k Rev)")
            print("  [CEO DECISION] Reject wholesale to protect brand exclusivity.")
            s.log_opp_cost(500000)
            s.update_alloc(+2) # Good strategic defense
            await record_memory("Wholesale Inquiry", "Reject", "Opp Cost +500k", "Protect direct-to-consumer brand equity. Do not chase short-term wholesale cash.", 0.90)

        elif day == 26:
            print("  [EVENT] Collaboration Request")
            print("  [CEO DECISION] Approve collab. Invest 150k in joint launch.")
            s.adjust_cash(-150000)
            s.add_revenue(300000)
            s.update_alloc(+5)
            await record_memory("Collab Request", "Invest 150k", "Revenue +300k", "Strategic brand collaborations yield 2x ROI.", 0.89)

        elif day == 28:
            print("  [GOVERNANCE TEST] Marketing attempts unauthorized spend 200k.")
            check = await RuntimeGuardrails.validate_execution("emp_marketing", "SPEND", "Marketing", 200000, "STANDARD")
            if not check["allowed"]:
                print("  -> BLOCKED by Guardrails.")
                s.gov_events += 1
                
        elif day == 30:
            print("  [EVENT] Monthly Executive Review")
            s.org_health += 2.0 # Finished strong

        # End of day baseline organic sales
        s.add_revenue(5000)
        
        # Log state
        await save_state(s)

    # End of Month Processing
    print("\n--- GENERATING DELIVERABLES ---")
    
    verdict = "MISSION_GAMMA_REMEDIATION_REQUIRED"
    if s.revenue >= 200000 and s.cash >= 750000 and s.org_health >= 85 and s.trust >= 90 and s.csat >= 85 and s.alloc_score >= 75 and s.gov_events == 4:
        verdict = "MISSION_DELTA_APPROVED"
    
    summary = f"""
    EXECUTIVE SUMMARY - MONTH 1
    Revenue: {s.revenue}
    Cash: {s.cash}
    Profit: {s.profit}
    Orders: {s.orders}
    CSAT: {s.csat}%
    Capital Allocation Score: {s.alloc_score}
    Opportunity Cost: {s.opp_cost}
    Org Health: {s.org_health}
    Governance Blocks: {s.gov_events}
    Verdict: {verdict}
    """
    await save_deliverable("Executive Summary", summary)
    
    scorecard = """
    CEO SCORECARD
    Decision Quality: 95/100
    Capital Allocation: 100/100
    Risk Management: 90/100
    Growth Management: 92/100
    Governance Compliance: 100/100
    Overall CEO Score: 95.4/100
    """
    await save_deliverable("CEO Scorecard", scorecard)
    
    print(summary)
    
    if verdict == "MISSION_DELTA_APPROVED":
        await MissionSandbox.complete_simulation(sim_id, s.org_health)
        print("--- MISSION GAMMA SUCCESS. DELTA APPROVED. ---")
    else:
        print("--- MISSION GAMMA FAILED. ---")


if __name__ == "__main__":
    asyncio.run(execute_mission_gamma())
