import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all

class KnowledgeBase:
    @staticmethod
    async def add_document(title: str, category: str, content: str):
        doc_id = f"kb_{uuid.uuid4().hex}"
        await db_run(
            "INSERT INTO production_kb_documents (id, title, category, content, created_at) VALUES (?, ?, ?, ?, ?)",
            [doc_id, title, category, content, datetime.now(timezone.utc).isoformat()]
        )
        return doc_id

    @staticmethod
    async def get_documents_by_category(category: str):
        return await db_all("SELECT * FROM production_kb_documents WHERE category = ?", [category])

    @staticmethod
    async def seed_initial_knowledge():
        await db_run("DELETE FROM production_kb_documents")
        docs = [
            ("EKVAAR Brand Bible", "Brand", "EKVAAR is India's defining streetwear brand. High quality, zero compromise. Core values: Authenticity, Boldness, Resilience."),
            ("Pricing Framework", "Finance", "Standard Margin target: 65%. No discount > 15% without Founder approval. Premium tier never discounted."),
            ("Naming Conventions", "Product", "Products follow: [Silhouette] - [Color] - [Collection]. E.g., Oversized T-Shirt - Obsidian - Origins.")
        ]
        for t, c, content in docs:
            await KnowledgeBase.add_document(t, c, content)
