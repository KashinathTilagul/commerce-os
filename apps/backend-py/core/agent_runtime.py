import sqlite3
import uuid
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')

class AgentRuntime:
    def __init__(self, agent_id: str, role: str):
        self.agent_id = agent_id
        self.role = role
        self.state = "IDLE" # IDLE, PLANNING, WAITING_APPROVAL, EXECUTING, COMPLETED, FAILED
        self.current_task_id = None

    def _get_connection(self):
        return sqlite3.connect(DB_PATH)

    def set_state(self, new_state: str):
        self.state = new_state
        self._log_audit("STATE_CHANGE", {"from": self.state, "to": new_state})

    def _log_audit(self, event_type: str, metadata: dict = None):
        # Could be logged to a file or db, appending to memory here
        # Assuming there is a memory log in DB, we'll just print for now or write to graph_entities
        pass

    def retrieve_memory(self, category: str):
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM knowledge WHERE category = ?", (category,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def store_memory(self, category: str, title: str, content: str, tags: list):
        conn = self._get_connection()
        cursor = conn.cursor()
        k_id = f"mem_{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT INTO knowledge (id, category, title, content, tags) VALUES (?, ?, ?, ?, ?)
        ''', (k_id, category, title, content, json.dumps(tags)))
        conn.commit()
        conn.close()

    def receive_task(self, task_id: str):
        self.current_task_id = task_id
        self.set_state("PLANNING")
        self._log_audit("TASK_RECEIVED", {"task_id": task_id})
        # Logic to generate plan goes here
        
        # After planning, request approval
        self.request_approval(task_id)

    def request_approval(self, task_id: str):
        self.set_state("WAITING_APPROVAL")
        conn = self._get_connection()
        cursor = conn.cursor()
        app_id = f"app_{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT INTO approvals (id, reference_id, reference_type, status) VALUES (?, ?, ?, ?)
        ''', (app_id, task_id, 'TASK', 'REQUESTED'))
        
        # Route to inbox
        inbox_id = f"inbox_{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT INTO inbox_items (id, source_agent, type, title, content, status, priority, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (inbox_id, self.agent_id, 'APPROVAL', f'Approval Request from {self.agent_id}', 'Please approve this execution plan.', 'UNREAD', 'HIGH', app_id))
        
        conn.commit()
        conn.close()

    def execute_task(self, task_id: str):
        self.set_state("EXECUTING")
        self._log_audit("TASK_EXECUTING", {"task_id": task_id})
        # Mock execution
        self.complete_task(task_id, {"status": "success"})

    def complete_task(self, task_id: str, output_data: dict):
        self.set_state("COMPLETED")
        conn = self._get_connection()
        cursor = conn.cursor()
        
        out_id = f"out_{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT INTO outputs (id, task_id, agent_id, output_type, content) VALUES (?, ?, ?, ?, ?)
        ''', (out_id, task_id, self.agent_id, "EXECUTION_RESULT", json.dumps(output_data)))
        
        cursor.execute('''
        UPDATE tasks SET status = ? WHERE id = ?
        ''', ("COMPLETED", task_id))
        
        conn.commit()
        conn.close()
        
        self.current_task_id = None
        self.set_state("IDLE")

    def fail_task(self, task_id: str, error: str):
        self.set_state("FAILED")
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", ("FAILED", task_id))
        
        # Route failure to inbox
        inbox_id = f"inbox_{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT INTO inbox_items (id, source_agent, type, title, content, status, priority, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (inbox_id, self.agent_id, 'FAILURE', f'Task Failed: {self.agent_id}', error, 'UNREAD', 'URGENT', task_id))
        
        conn.commit()
        conn.close()
        self.set_state("IDLE")
