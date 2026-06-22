import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # PHASE B - SHARED MEMORY SYSTEM
    # graph_entities
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS graph_entities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        attributes TEXT, -- JSON payload
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # graph_relationships
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS graph_relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        attributes TEXT, -- JSON payload
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES graph_entities (id),
        FOREIGN KEY (target_id) REFERENCES graph_entities (id)
    )
    ''')

    # knowledge
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS knowledge (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # decisions
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        context TEXT NOT NULL,
        status TEXT NOT NULL, -- PENDING, APPROVED, REJECTED, EXECUTED
        proposed_by TEXT NOT NULL,
        approved_by TEXT,
        confidence_score REAL,
        metadata TEXT, -- JSON payload
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # outputs
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS outputs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        output_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id)
    )
    ''')

    # approvals
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        reference_id TEXT NOT NULL, -- decision_id or task_id
        reference_type TEXT NOT NULL,
        status TEXT NOT NULL, -- REQUESTED, APPROVED, REJECTED
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
    )
    ''')

    # tasks
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_agent TEXT,
        status TEXT NOT NULL, -- PENDING, IN_PROGRESS, WAITING_APPROVAL, COMPLETED, FAILED
        priority TEXT NOT NULL,
        metadata TEXT, -- JSON payload
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # missions
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT NOT NULL,
        status TEXT NOT NULL, -- ACTIVE, COMPLETED, PAUSED
        metadata TEXT, -- JSON payload
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # PHASE C - FOUNDER INBOX
    # inbox_items
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inbox_items (
        id TEXT PRIMARY KEY,
        source_agent TEXT NOT NULL,
        type TEXT NOT NULL, -- ESCALATION, APPROVAL, ALERT, MESSAGE, RISK, FAILURE
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL, -- UNREAD, ASSIGNED, SNOOZED, RESOLVED, REJECTED, APPROVED
        priority TEXT NOT NULL,
        action_required BOOLEAN DEFAULT 1,
        reference_id TEXT, -- ID of the related task, decision, etc
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
    )
    ''')

    conn.commit()
    conn.close()
    print("Database schema successfully initialized.")

if __name__ == '__main__':
    init_db()
