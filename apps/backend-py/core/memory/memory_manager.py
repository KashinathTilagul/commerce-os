import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Any

class PersistentMemory:
    def __init__(self, db_path: str = "ekvaar_memory.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Threads/Checkpoints table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS threads (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at TEXT,
                last_updated TEXT,
                metadata TEXT
            )
        ''')
        
        # Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT,
                role TEXT,
                content TEXT,
                timestamp TEXT,
                FOREIGN KEY(thread_id) REFERENCES threads(id)
            )
        ''')
        
        # Context References (Vector-like simple key-value for now)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS context_refs (
                id TEXT PRIMARY KEY,
                domain TEXT,
                content TEXT,
                tags TEXT,
                created_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def create_thread(self, thread_id: str, title: str, metadata: Dict = None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
            INSERT INTO threads (id, title, created_at, last_updated, metadata)
            VALUES (?, ?, ?, ?, ?)
        ''', (thread_id, title, now, now, json.dumps(metadata or {})))
        
        conn.commit()
        conn.close()

    def add_message(self, thread_id: str, role: str, content: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        cursor.execute('''
            INSERT INTO messages (thread_id, role, content, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (thread_id, role, content, now))
        
        cursor.execute('''
            UPDATE threads SET last_updated = ? WHERE id = ?
        ''', (now, thread_id))
        
        conn.commit()
        conn.close()

    def get_thread_history(self, thread_id: str) -> List[Dict[str, str]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT role, content, timestamp FROM messages 
            WHERE thread_id = ? ORDER BY timestamp ASC
        ''', (thread_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{"role": r[0], "content": r[1], "timestamp": r[2]} for r in rows]

# Singleton instance
memory_db = PersistentMemory()
