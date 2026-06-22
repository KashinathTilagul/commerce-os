from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import sqlite3
import os
import sys

# Add core path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "core"))
from inbox_manager import InboxManager

app = FastAPI(title="EKVAAR OS API")

# Allow frontend to access the API - restrict to known origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3005",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3005",
]
if os.getenv("ENV") == "production":
    ALLOWED_ORIGINS.extend([
        "https://os.ekvaar.com",
        "https://www.ekvaar.com",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ekvaar_business.db')
inbox_mgr = InboxManager()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# -----------------
# INBOX ENDPOINTS
# -----------------

@app.get("/api/inbox")
def get_inbox():
    items = inbox_mgr.fetch_inbox()
    return items

@app.get("/api/inbox/unread")
def get_unread_count():
    items = inbox_mgr.fetch_inbox(status_filter="UNREAD")
    return {"count": len(items), "items": items}

class InboxActionRequest(BaseModel):
    action: str
    feedback: str = ""

@app.post("/api/inbox/{item_id}/action")
def take_inbox_action(item_id: str, req: InboxActionRequest):
    try:
        res = inbox_mgr.take_action(item_id, req.action.upper(), req.feedback)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -----------------
# GRAPH ENDPOINTS
# -----------------

@app.get("/api/graph/metrics")
def get_graph_metrics():
    conn = get_db()
    cursor = conn.cursor()
    
    # Very basic aggregations from graph_entities
    cursor.execute("SELECT count(*) FROM graph_entities WHERE type = 'orders'")
    orders_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM graph_entities WHERE type = 'returns'")
    returns_count = cursor.fetchone()[0]

    # Missions
    cursor.execute("SELECT * FROM missions WHERE status = 'ACTIVE'")
    missions = [dict(row) for row in cursor.fetchall()]
    
    # Inventory Alerts (mocked from pending decisions for now)
    cursor.execute("SELECT * FROM decisions WHERE status = 'PENDING'")
    decisions = [dict(row) for row in cursor.fetchall()]

    # Real decisions for the Decisions panel
    cursor.execute("SELECT * FROM decisions ORDER BY created_at DESC LIMIT 5")
    all_decisions = [dict(row) for row in cursor.fetchall()]

    # Tasks
    cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5")
    tasks = [dict(row) for row in cursor.fetchall()]

    conn.close()
    
    return {
        "revenue": {"today": orders_count * 145}, # Mock calculation
        "orders": {"today": orders_count},
        "returns": {"pending": returns_count},
        "missions": {"list": missions},
        "inventory": {"decisions": decisions},
        "tasks": tasks,
        "decisions": all_decisions
    }

# -----------------
# AGENT ENDPOINTS
# -----------------

@app.get("/api/agents/runtime")
def get_runtime_metrics():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT count(*) FROM tasks WHERE status IN ('PENDING', 'ASSIGNED')")
    waiting = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM tasks WHERE status = 'COMPLETED'")
    completed = cursor.fetchone()[0]
    
    cursor.execute("SELECT count(*) FROM tasks WHERE status = 'FAILED'")
    failed = cursor.fetchone()[0]
    
    cursor.execute("SELECT * FROM approvals WHERE status = 'REQUESTED'")
    pending_approvals = [dict(row) for row in cursor.fetchall()]
    
    conn.close()

    return {
        "metrics": {
            "active_agents": 23,
            "executing_agents": waiting, # Mock logic: if tasks exist, assume they are running
            "waiting_agents": 23 - waiting if (23 - waiting) > 0 else 0,
            "completed_plans": completed,
            "failed_plans": failed
        },
        "pending_approvals": pending_approvals
    }


from agent.router import router as llm_router

@app.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket):
    await websocket.accept()
    boot_messages = [
        "\r\n\x1b[1;36m[EKVAAR OS]\x1b[0m Booting Hermes Intelligence Layer...\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Python Unified Backend v2.0.0 Online.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m SQLite tables initialized.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Graph, Agent, and Content routes mounted.\r\n",
        "\x1b[1;33m[SYSTEM]\x1b[0m LLM fallback router initialized with active APIs.\r\n",
        "\r\n\x1b[1;35mHermes>\x1b[0m "
    ]
    for msg in boot_messages:
        await websocket.send_text(msg)
        await asyncio.sleep(0.1)

    cmd_buffer = []

    try:
        while True:
            data = await websocket.receive_text()
            
            # Simple terminal keystroke handling
            for char in data:
                if char == '\r': # Enter key pressed
                    await websocket.send_text("\r\n")
                    command = "".join(cmd_buffer).strip()
                    cmd_buffer.clear()
                    
                    if command:
                        await websocket.send_text(f"\x1b[1;36m[Agent]\x1b[0m Routing intent to LLM Router...\r\n")
                        
                        # Call LLM Router
                        try:
                            # Load soul persona prompt context
                            soul_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core", "identity", "soul.md")
                            system_prompt = ""
                            if os.path.exists(soul_path):
                                with open(soul_path, "r", encoding="utf-8") as sf:
                                    system_prompt = sf.read()

                            # Run fallback route request
                            response = await llm_router.route_request(
                                prompt=command,
                                system_prompt=system_prompt,
                                task_type="general"
                            )
                            
                            # Render output
                            if response.get("status") == "success":
                                provider = response.get("provider", "Unknown")
                                model = response.get("model", "")
                                text_msg = response.get("message", "")
                                await websocket.send_text(f"\x1b[1;32m[{provider} ({model})]\x1b[0m {text_msg}\r\n")
                            else:
                                error_msg = response.get("message", "Routing failed.")
                                await websocket.send_text(f"\x1b[1;31m[Error]\x1b[0m {error_msg}\r\n")
                        except Exception as inner_ex:
                            await websocket.send_text(f"\x1b[1;31m[System Error]\x1b[0m {str(inner_ex)}\r\n")
                    
                    await websocket.send_text("\r\n\x1b[1;35mHermes>\x1b[0m ")
                elif char in ('\x7f', '\x08'): # Backspace handling
                    if cmd_buffer:
                        cmd_buffer.pop()
                        await websocket.send_text("\b \b") # Erase last character on screen
                else:
                    cmd_buffer.append(char)
                    await websocket.send_text(char) # Echo character
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        print("Client disconnected.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
