import sqlite3
import uuid
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')

class InboxManager:
    def __init__(self):
        pass
        
    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def route_to_inbox(self, source_agent: str, item_type: str, title: str, content: str, priority: str = "MEDIUM", reference_id: str = None):
        """Routes an item to the Founder Inbox."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        item_id = f"inbox_{uuid.uuid4().hex[:8]}"
        
        cursor.execute('''
        INSERT INTO inbox_items (id, source_agent, type, title, content, status, priority, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (item_id, source_agent, item_type, title, content, "UNREAD", priority, reference_id))
        
        conn.commit()
        conn.close()
        return item_id

    def fetch_inbox(self, status_filter=None):
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if status_filter:
            cursor.execute("SELECT * FROM inbox_items WHERE status = ? ORDER BY created_at DESC", (status_filter,))
        else:
            cursor.execute("SELECT * FROM inbox_items ORDER BY created_at DESC")
            
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def take_action(self, item_id: str, action: str, feedback: str = None):
        """
        Takes action on an inbox item. Actions: APPROVE, REJECT, ASSIGN, SNOOZE, RESOLVE
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        new_status = ""
        if action == "APPROVE":
            new_status = "APPROVED"
        elif action == "REJECT":
            new_status = "REJECTED"
        elif action == "ASSIGN":
            new_status = "ASSIGNED"
        elif action == "SNOOZE":
            new_status = "SNOOZED"
        elif action == "RESOLVE":
            new_status = "RESOLVED"
        else:
            raise ValueError("Invalid action")
            
        cursor.execute('''
        UPDATE inbox_items 
        SET status = ?, resolved_at = ?
        WHERE id = ?
        ''', (new_status, datetime.now().isoformat(), item_id))
        
        # If action relates to an approval, update the approvals table
        if action in ["APPROVE", "REJECT"]:
            cursor.execute('''
            SELECT reference_id, type FROM inbox_items WHERE id = ?
            ''', (item_id,))
            row = cursor.fetchone()
            if row and row[1] == "APPROVAL" and row[0]:
                cursor.execute('''
                UPDATE approvals 
                SET status = ?, feedback = ?, resolved_at = ?
                WHERE id = ?
                ''', (action + "D", feedback, datetime.now().isoformat(), row[0]))
                
        conn.commit()
        conn.close()
        return {"status": "SUCCESS", "new_status": new_status}
