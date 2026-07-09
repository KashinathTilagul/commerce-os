"""
EKVAAR OS — Unified Python Backend (FastAPI)
Replaces the legacy Node.js backend entirely.
"""

import os
from dotenv import load_dotenv
# Load environment variables from parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio

from core.database import init_db, get_pool
from core.automation.scheduler import scheduler
from core.exceptions import EkvaarException
import core.automation.escalation_engine  # Load escalation listeners

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database and services on startup."""
    await init_db()
    pool = get_pool()
    await pool.initialize()
    print("[EKVAAR OS] SQLite database initialized — all 28 tables ready.")
    print("[EKVAAR OS] Connection pool initialized with 5 connections.")
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

@app.websocket("/ws/agent")
async def websocket_agent(websocket: WebSocket):
    await websocket.accept()
    
    # Check LLM availability
    from core.llm.router import router
    llm_status = "CONNECTED" if router.client else "NOT CONFIGURED"
    llm_provider = router.provider or "NONE"
    
    boot_messages = [
        "\r\n\x1b[1;36m[EKVAAR OS]\x1b[0m Booting Hermes Intelligence Layer...\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Python Unified Backend v2.0.0 Online.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m 28 SQLite tables initialized.\r\n",
        "\x1b[1;32m[SYSTEM]\x1b[0m Graph, Agent, and Content routes mounted.\r\n",
        "\x1b[1;33m[SYSTEM]\x1b[0m Node.js backend fully deprecated.\r\n",
        f"\x1b[1;34m[LLM]\x1b[0m Status: {llm_status} | Provider: {llm_provider}\r\n",
    ]
    
    if not router.client:
        boot_messages.append("\x1b[1;33m[WARNING]\x1b[0m No LLM API key found. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in .env file.\r\n")
        boot_messages.append("\x1b[1;33m[WARNING]\x1b[0m Agent chat will be disabled until LLM is configured.\r\n")
    else:
        boot_messages.append("\x1b[1;32m[SYSTEM]\x1b[0m LLM router initialized and ready.\r\n")
    
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
                if not llm_router.client:
                    await websocket.send_text("[System Error] No LLM API key configured. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in your .env file to enable agent chat.")
                    await websocket.send_text("\r\n[Hermes> ")
                    continue
                
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


@app.on_event("startup")
async def startup_event():
    """Schedule telemetry and risk assessment on startup."""
    from core.telemetry.telemetry_ingestion import telemetry
    from core.telemetry.risk_engine import risk_engine
    from core.telemetry.signal_detection import signal_engine
    
    async def run_telemetry_cycle():
        await telemetry.ingest_from_live_metrics()
        await telemetry.ingest_agent_metrics()
        await signal_engine.run_full_detection_cycle()
        await risk_engine.assess_risks()
    
    from core.automation.scheduler import scheduler
    scheduler.schedule_job("telemetry_cycle", 300, run_telemetry_cycle)
    print("[EKVAAR OS] Telemetry and Risk assessment scheduled every 5 minutes.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
