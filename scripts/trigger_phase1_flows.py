import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend-py'))

from core.database import init_db
from core.events.dispatcher import dispatcher
import core.automation.escalation_engine

async def trigger_flows():
    await init_db()
    print("Database initialized.")

    # FLOW A: Inventory Risk
    print("Triggering FLOW A: Inventory Risk...")
    await dispatcher.emit("escalation_required", {
        "source_type": "INVENTORY_ENGINE",
        "source_id": "inv_sku_109",
        "category": "INVENTORY",
        "priority": "P0",
        "title": "Critical Stockout: Core Product (Black)",
        "summary": "Inventory levels dropped below safety stock. Remaining: 4 units. Expected run-out: 12 hours.",
        "recommended_action": "Approve expedited restock order to Supplier Alpha.",
        "approve_consequence": "Agent generates PO and emails supplier.",
        "ignore_consequence": "Expected out-of-stock event tomorrow, projected revenue loss $2,400.",
        "deep_link": "exec_workspace",
        "payload": {
            "why": "Shopify sync detected a sudden spike in sales draining the safety buffer.",
            "sku": "CORE-BLK-M",
            "quantity": 4
        }
    })

    # FLOW B: Agent Failure
    print("Triggering FLOW B: Agent Failure...")
    await dispatcher.emit("escalation_required", {
        "source_type": "AGENT_RUNTIME",
        "source_id": "agent_hermes_01",
        "category": "AGENTS",
        "priority": "P0",
        "title": "Agent Execution Failure: Shopify Sync",
        "summary": "Hermes agent failed to sync latest orders to CRM after 3 automatic retries.",
        "recommended_action": "Manually authorize force-sync with reset credentials.",
        "approve_consequence": "Agent executes emergency force sync.",
        "ignore_consequence": "Order data will remain stale, affecting downstream automation.",
        "deep_link": "agents",
        "payload": {
            "why": "API endpoint returned 429 Too Many Requests consistently.",
            "agent": "Hermes",
            "retries": 3
        }
    })

    # FLOW C: Mission Blocker
    print("Triggering FLOW C: Mission Blocker...")
    await dispatcher.emit("escalation_required", {
        "source_type": "MISSION_ENGINE",
        "source_id": "mission_q3_launch",
        "category": "OPERATIONS",
        "priority": "P1",
        "title": "Mission Blocked: Q3 Campaign Assets",
        "summary": "Design agent cannot proceed without final approval on ad copy.",
        "recommended_action": "Review and approve the attached ad copy document.",
        "approve_consequence": "Design agent will immediately begin rendering assets.",
        "ignore_consequence": "Mission timeline delayed by 1 day.",
        "deep_link": "mission_control",
        "payload": {
            "why": "Dependency node 'Copywriting' reached 'PENDING_APPROVAL' state.",
            "mission_id": "M-2026-Q3"
        }
    })

    print("All flows triggered. Check Founder Inbox.")

if __name__ == "__main__":
    asyncio.run(trigger_flows())
