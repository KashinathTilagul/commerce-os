import sqlite3
import os
import uuid
import urllib.request
import json
from datetime import datetime

# Shopify Credentials (would be injected via env variables)
SHOPIFY_STORE_URL = os.environ.get("SHOPIFY_STORE_URL", "https://your-store.myshopify.com")
SHOPIFY_ACCESS_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "dummy_token")

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')

class ShopifyIntegrator:
    def __init__(self):
        self.headers = {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json"
        }

    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def fetch_data(self, endpoint: str):
        if not SHOPIFY_ACCESS_TOKEN or SHOPIFY_ACCESS_TOKEN == "dummy_token":
            # System is in standby mode waiting for real token
            return []
            
        # Clean the base URL
        base_url = SHOPIFY_STORE_URL.rstrip('/')
        if not base_url.endswith('.myshopify.com'):
            # If they provided a custom domain, we might need the myshopify one, 
            # but we will attempt the API call anyway as some custom domains map it.
            # Best practice is to use myshopify.com
            pass

        api_url = f"{base_url}/admin/api/2023-10/{endpoint}"
        print(f"[Shopify Sync] Fetching {api_url} ...")
        
        req = urllib.request.Request(api_url, headers=self.headers)
        
        try:
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    # The root key is usually the endpoint name without .json
                    root_key = endpoint.split('.')[0]
                    return data.get(root_key, [])
                else:
                    print(f"[Shopify Sync] Error {response.status} fetching {endpoint}")
                    return []
        except Exception as e:
            print(f"[Shopify Sync] Failed to fetch {endpoint}: {e}")
            return []

    def sync_to_graph(self):
        """Fetches all required data and syncs it into the graph_entities table."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        entities = [
            ("products", self.fetch_data("products.json")),
            ("orders", self.fetch_data("orders.json")),
            ("customers", self.fetch_data("customers.json")),
            ("returns", self.fetch_data("returns.json")),
            ("collections", self.fetch_data("custom_collections.json"))
        ]
        
        for entity_type, data_list in entities:
            for item in data_list:
                item_id = str(item.get("id"))
                cursor.execute('''
                INSERT OR REPLACE INTO graph_entities (id, type, attributes, updated_at)
                VALUES (?, ?, ?, ?)
                ''', (f"shopify_{entity_type}_{item_id}", entity_type, json.dumps(item), datetime.now().isoformat()))
                
        conn.commit()
        
        # GENERATE INTELLIGENCE
        self._generate_inventory_alerts(cursor)
        self._generate_revenue_metrics(cursor)
        self._generate_decision_candidates(cursor)
        
        conn.commit()
        conn.close()
        print("Shopify sync complete. Data persisted to Graph DB.")

    def _generate_inventory_alerts(self, cursor):
        """Generates alerts for low inventory variants."""
        cursor.execute("SELECT attributes FROM graph_entities WHERE type = 'products'")
        for row in cursor.fetchall():
            product = json.loads(row[0])
            for variant in product.get("variants", []):
                if variant.get("inventory_quantity", 0) <= 5:
                    alert_id = f"alert_low_stock_{product['id']}_{variant['id']}"
                    cursor.execute('''
                    INSERT OR IGNORE INTO inbox_items (id, source_agent, type, title, content, status, priority)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (alert_id, 'inventory_agent', 'ALERT', f'Low Stock: {product["title"]} ({variant["title"]})', 'Quantity is critically low.', 'UNREAD', 'HIGH'))

    def _generate_revenue_metrics(self, cursor):
        """Analyzes synced orders to generate revenue metrics into knowledge graph."""
        total_rev = sum([float(json.loads(row[0]).get("total_price", 0)) for row in cursor.execute("SELECT attributes FROM graph_entities WHERE type = 'orders'")])
        
        k_id = f"mem_daily_rev_{datetime.now().strftime('%Y%m%d')}"
        cursor.execute('''
        INSERT OR REPLACE INTO knowledge (id, category, title, content)
        VALUES (?, ?, ?, ?)
        ''', (k_id, 'ekvaar', 'Daily Revenue Sync', f'Total recognized revenue today: ${total_rev}'))

    def _generate_decision_candidates(self, cursor):
        """Proposes decisions based on the new graph state."""
        cursor.execute("SELECT count(*) FROM graph_entities WHERE type = 'returns'")
        if cursor.fetchone()[0] > 0:
            dec_id = "dec_investigate_returns_trigger"
            cursor.execute('''
            INSERT OR IGNORE INTO decisions (id, title, context, status, proposed_by)
            VALUES (?, ?, ?, ?, ?)
            ''', (dec_id, "Investigate recent returns", "Return count increased after Shopify sync.", "PENDING", "ecommerce_agent"))

if __name__ == "__main__":
    integrator = ShopifyIntegrator()
    integrator.sync_to_graph()
