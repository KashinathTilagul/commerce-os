import asyncio
from core.database import init_db
from core.reality_integration.knowledge_base import KnowledgeBase
from core.reality_integration.product_db import ProductDB
from core.reality_integration.live_metrics import LiveMetrics
from core.approval_engine.decision_queue import DecisionQueue
from core.executive_brief.brief_generator import BriefGenerator

async def init_delta():
    print("--- INITIALIZING MISSION DELTA: REALITY INTEGRATION ---")
    await init_db()
    
    print("Seeding Knowledge Base...")
    await KnowledgeBase.seed_initial_knowledge()
    
    print("Seeding Product DB...")
    await ProductDB.seed_initial_products()
    
    print("Seeding Live Metrics...")
    await LiveMetrics.seed_initial_metrics()
    
    print("Seeding Decision Queue...")
    await DecisionQueue.seed_initial_queue()
    
    print("Generating Initial Executive Brief...")
    brief = await BriefGenerator.generate_morning_brief()
    print("Brief Generated Successfully.")
    
    print("--- MISSION DELTA INITIALIZATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(init_delta())
