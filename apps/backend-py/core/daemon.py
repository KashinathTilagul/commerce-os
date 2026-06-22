import os
import sys
import time
import sqlite3
import logging
from datetime import datetime
import json

# Setup core paths
sys.path.append(os.path.dirname(__file__))
from shopify_sync import ShopifyIntegrator

# Setup agent paths
AGENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agents")
sys.path.append(AGENTS_DIR)
from hermes.agent import HermesOrchestrator
from founder_clone.agent import FounderCloneAgent
from chief_of_staff.agent import ChiefOfStaffAgent

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EkvaarDaemon")

class EkvaarDaemon:
    def __init__(self):
        self.shopify = ShopifyIntegrator()
        self.hermes = HermesOrchestrator()
        self.founder_clone = FounderCloneAgent()
        self.chief_of_staff = ChiefOfStaffAgent()
        self.running = False
        self.poll_interval = 10 # seconds

    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def start(self):
        logger.info("Starting EKVAAR OS Backend Daemon...")
        self.running = True
        
        while self.running:
            try:
                self.run_cycle()
            except Exception as e:
                logger.error(f"Error in daemon cycle: {e}")
            
            time.sleep(self.poll_interval)

    def stop(self):
        self.running = False
        logger.info("Stopping EKVAAR OS Backend Daemon...")

    def run_cycle(self):
        logger.info("--- Beginning Execution Cycle ---")
        
        # 1. Sync external data (Shopify)
        logger.info("Syncing Shopify Data...")
        self.shopify.sync_to_graph()
        
        # 2. Triage Inbox
        self.triage_inbox()
        
        # 3. Route Pending Decisions to Founder Clone
        self.process_pending_decisions()
        
        # 4. Route Tasks via Hermes
        self.process_pending_tasks()
        
        logger.info("--- Execution Cycle Complete ---")

    def triage_inbox(self):
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Chief of staff reads UNREAD inbox items
        cursor.execute("SELECT * FROM inbox_items WHERE status = 'UNREAD'")
        unread = [dict(row) for row in cursor.fetchall()]
        
        if unread:
            logger.info(f"Chief of Staff triaging {len(unread)} inbox items...")
            triaged = self.chief_of_staff.triage_inbox(unread)
            
            # Simple mock resolution of triage
            for msg in triaged.get("delegated", []):
                cursor.execute("UPDATE inbox_items SET status = 'ASSIGNED' WHERE id = ?", (msg["id"],))
        
        conn.commit()
        conn.close()

    def process_pending_decisions(self):
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM decisions WHERE status = 'PENDING'")
        pending_decisions = [dict(row) for row in cursor.fetchall()]
        
        for dec in pending_decisions:
            logger.info(f"Founder Clone analyzing decision: {dec['title']}")
            output = self.founder_clone.analyze_decision(dec)
            
            # If founder clone recommends APPROVE with high confidence, auto-approve?
            # Or send to inbox. Architecture says route to inbox.
            cursor.execute('''
            UPDATE decisions 
            SET status = 'WAITING_APPROVAL', confidence_score = ?, metadata = ?
            WHERE id = ?
            ''', (output['confidence_score'], json.dumps(output), dec['id']))
            
            cursor.execute('''
            INSERT INTO inbox_items (id, source_agent, type, title, content, status, priority, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f"inbox_dec_{dec['id']}", 'founder_clone', 'APPROVAL', f"Decision Required: {dec['title']}", 
                  f"Clone Recommendation: {output['recommended_decision']}. {output['predicted_founder_response']}", 
                  'UNREAD', 'HIGH', dec['id']))
            
        conn.commit()
        conn.close()

    def process_pending_tasks(self):
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tasks WHERE status = 'PENDING'")
        pending_tasks = [dict(row) for row in cursor.fetchall()]
        
        for task in pending_tasks:
            logger.info(f"Hermes routing task: {task['title']}")
            assigned_agent = self.hermes.route_task(task)
            
            cursor.execute("UPDATE tasks SET status = 'ASSIGNED', assigned_agent = ? WHERE id = ?", 
                          (assigned_agent, task['id']))
            
        conn.commit()
        conn.close()

if __name__ == "__main__":
    daemon = EkvaarDaemon()
    daemon.start()
