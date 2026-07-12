"""
EKVAAR OS — Unified Python Backend (FastAPI)
Replaces the legacy Node.js backend entirely.
"""

import os
from dotenv import load_dotenv
# Load environment variables from parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI, WebSocket, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
import hashlib

from core.database import init_db, get_pool
from core.automation.scheduler import scheduler
from core.exceptions import EkvaarException
import core.automation.escalation_engine
from core.automation.trigger_system import ensure_triggers_registered  # Load escalation listeners

# Import all route modules
from routes.graph_routes import router as graph_router
from routes.content_routes import router as content_router
from routes.shopify_routes import router as shopify_router
from routes.inbox_routes import router as inbox_router
from routes.digital_employee_routes import router as digital_employee_router
from routes.protocols_routes import router as protocols_router
from routes.execution import router as execution_router
from routes.reality_routes import router as reality_router
from routes.sync_routes import router as sync_router
from routes.chat_routes import router as chat_router
from routes.cpu_routes import router as cpu_router
from routes.issues_routes import router as issues_router
from routes.runs_routes import router as runs_router
from routes.approvals_routes import router as approvals_router
from routes.routines_routes import router as routines_router
from routes.telemetry_routes import router as telemetry_router
from routes.workflow_routes import router as workflow_router
from routes.dashboard_routes import router as dashboard_router
from routes.jarvis_routes import router as jarvis_router, load_whisper


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database and services on startup."""
    await init_db()
    pool = get_pool()
    await pool.initialize()
    print("[EKVAAR OS] SQLite database initialized — all tables ready.")
    print("[EKVAAR OS] Connection pool initialized with 5 connections.")
    
    ensure_triggers_registered()
    print("[EKVAAR OS] Workflow trigger system operational.")

    # Load Whisper STT model in background so it's ready on first request
    import threading
    threading.Thread(target=load_whisper, daemon=True).start()
    
    from core.telemetry.telemetry_ingestion import telemetry
    from core.telemetry.risk_engine import risk_engine
    from core.telemetry.signal_detection import signal_engine
    
    async def run_telemetry_cycle():
        await telemetry.ingest_from_live_metrics()
        await telemetry.ingest_agent_metrics()
        await signal_engine.run_full_detection_cycle()
        await risk_engine.assess_risks()
    
    scheduler.schedule_job("telemetry_cycle", 300, run_telemetry_cycle)
    print("[EKVAAR OS] Telemetry and Risk assessment scheduled every 5 minutes.")
    
    await scheduler.start()
    
    yield
    await scheduler.stop()
    await pool.close_all()
    print("[EKVAAR OS] Shutting down.")


app = FastAPI(
    title="EKVAAR OS — Agentic Intelligence Layer",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for the React Frontend - restrict to known origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Ekvaar-Os-Run-Id", "X-User-Id"],
)


@app.exception_handler(EkvaarException)
async def ekvaar_exception_handler(request: Request, exc: EkvaarException):
    """Handle all EKVAAR custom exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details
        }
    )


# ─── Mount all API routers under /api ────────────────────────────────────────

app.include_router(graph_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(shopify_router, prefix="/api")
app.include_router(inbox_router, prefix="/api")
app.include_router(digital_employee_router, prefix="/api")
app.include_router(protocols_router, prefix="/api")
app.include_router(reality_router, prefix="/api")
app.include_router(sync_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(execution_router, prefix="/api")
app.include_router(cpu_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(runs_router, prefix="/api")
app.include_router(approvals_router, prefix="/api")
app.include_router(routines_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")
app.include_router(workflow_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(jarvis_router)


# ─── Root health check ──────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "online",
        "module": "EKVAAR OS Unified Backend",
        "version": "2.0.0",
        "engine": "FastAPI + SQLite (aiosqlite)",
        "routes": [
            "/api/graph/*",
            "/api/content/*",
        ]
    }


from core.llm.router import router as llm_router

import select, signal, struct, fcntl, termios, json

async def verify_ws_token(token: str) -> bool:
    """Verify WebSocket auth token. In production, use JWT or session validation."""
    jwt_secret = os.getenv("JWT_SECRET", "")
    if not jwt_secret:
        return True
    return token == jwt_secret

@app.websocket("/ws/opencode")
async def ws_opencode(websocket: WebSocket, token: str = Query(None)):
    if not token or not await verify_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return
    await websocket.accept()
    try:
        import pty
        pid, master_fd = pty.fork()
    except ImportError:
        await websocket.send_bytes(b"pty not available on this platform\r\n")
        return

    if pid == 0:
        # child: exec opencode
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['COLORTERM'] = 'truecolor'
        try:
            os.execvpe('opencode', ['opencode'], env)
        except Exception:
            os.execvpe('sh', ['sh'], env)

    # parent: proxy PTY <-> WebSocket
    fl = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

    loop = asyncio.get_event_loop()

    async def pty_to_ws():
        while True:
            try:
                r, _, _ = select.select([master_fd], [], [], 0.05)
                if r:
                    data = os.read(master_fd, 4096)
                    await websocket.send_bytes(data)
            except OSError:
                break
            await asyncio.sleep(0)

    async def ws_to_pty():
        from fastapi import WebSocketDisconnect
        try:
            while True:
                msg = await websocket.receive()
                if 'bytes' in msg and msg['bytes']:
                    os.write(master_fd, msg['bytes'])
                elif 'text' in msg and msg['text']:
                    try:
                        d = json.loads(msg['text'])
                        if d.get('type') == 'resize':
                            winsize = struct.pack('HHHH', d['rows'], d['cols'], 0, 0)
                            fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                    except Exception:
                        os.write(master_fd, msg['text'].encode())
        except Exception:
            pass

    try:
        await asyncio.gather(pty_to_ws(), ws_to_pty())
    finally:
        try:
            os.kill(pid, signal.SIGTERM)
            os.waitpid(pid, os.WNOHANG)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except Exception:
            pass


@app.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket, token: str = Query(None)):
    if not token or not await verify_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return
    await websocket.accept()
    
    from core.llm.router import MODEL_ID
    boot_messages = [
        "\r\n\x1b[1;36m[EKVAAR OS]\x1b[0m Booting Hermes Intelligence Layer...\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Python Unified Backend v2.0.0 Online.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m 28 SQLite tables initialized.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Graph, Agent, and Content routes mounted.\r\n",
        "\x1b[1;33m[SYSTEM]\x1b[0m Node.js backend fully deprecated.\r\n",
        f"\x1b[1;34m[LLM]\x1b[0m Provider: Amazon Bedrock | Model: {MODEL_ID}\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m LLM router initialized — Amazon Bedrock.\r\n",
    ]
    
    boot_messages.append("\r\n\x1b[1;35mHermes>\x1b[0m ")
    
    for msg in boot_messages:
        await websocket.send_text(msg)
        await asyncio.sleep(0.1)

    cmd_buffer = []

    try:
        while True:
            command = await websocket.receive_text()
            command = command.strip()
            
            if not command:
                continue

            try:
                # Load soul persona prompt context
                soul_path = os.path.join("core", "identity", "soul.md")
                system_prompt = ""
                if os.path.exists(soul_path):
                    with open(soul_path, "r", encoding="utf-8") as sf:
                        system_prompt = sf.read()

                # Check if LLM is available before routing
                # Bedrock errors surface via route_request return value; no pre-check needed
                
                # Run fallback route request
                response = await llm_router.route_request(
                    prompt=command,
                    system_prompt=system_prompt,
                    task_type="general"
                )
                
                # Render output directly without terminal prefixes
                if response.get("status") == "success":
                    text_msg = response.get("message", "")
                    await websocket.send_text(text_msg)
                    await websocket.send_text("\r\n[Hermes> ")
                else:
                    error_msg = response.get("message", "Routing failed.")
                    await websocket.send_text(f"[Error] {error_msg}")
                    await websocket.send_text("\r\n[Hermes> ")
            except Exception as inner_ex:
                await websocket.send_text(f"[System Error] {str(inner_ex)}")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        print("Client disconnected.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
