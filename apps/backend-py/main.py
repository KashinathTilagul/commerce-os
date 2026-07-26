"""
EKVAAR OS — Python Sidecar (FastAPI)
Serves only Jarvis TTS/STT (edge-tts + faster-whisper). Everything else
(auth, agents, orders, issues, telemetry, risk, workflow, etc.) lives in the
Next.js/Prisma app — see docs/architecture/decision-log.md for the migration
that made this the single source of truth.
"""

import os
from dotenv import load_dotenv
# Load environment variables from parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from core.exceptions import EkvaarException
from routes.jarvis_routes import router as jarvis_router, load_whisper


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load Whisper STT model in background so it's ready on first request
    import threading
    threading.Thread(target=load_whisper, daemon=True).start()
    yield


app = FastAPI(
    title="EKVAAR OS — Jarvis Voice Sidecar",
    version="1.0.0",
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


app.include_router(jarvis_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "jarvis-sidecar"}
