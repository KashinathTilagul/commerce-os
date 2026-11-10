"""
EKVAAR OS — Python Sidecar (FastAPI)
Serves browser automation capabilities that require the Python runtime.
Business data and application APIs live in the Next.js/Prisma app.
"""

import os
import hmac
from dotenv import load_dotenv
# Load environment variables from parent directory .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.exceptions import EkvaarException
from routes.browser_routes import router as browser_router


app = FastAPI(
    title="EKVAAR OS — Browser Automation Sidecar",
    version="1.0.0",
)

@app.middleware('http')
async def worker_auth(request: Request, call_next):
    if request.url.path.startswith('/api/browser'):
        secret = os.getenv('BROWSE_WORKER_KEY') or os.getenv('BROWSER_WORKER_KEY')
        if not secret or not hmac.compare_digest(request.headers.get('x-worker-key', ''), secret):
            return JSONResponse(status_code=401, content={'error': 'Unauthorized'})
        if os.getenv('BROWSER_AUTOMATION_ENABLED') != '1':
            return JSONResponse(status_code=503, content={'error': 'Browser automation requires an isolated network deployment before enabling'})
    return await call_next(request)

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
        "https://commerce.abata.tech",
        "https://app.commerce.abata.tech",
        "https://os.ekvaar.com",
        "https://www.ekvaar.com",
    ])
    for env_key in ("NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"):
        extra_origin = os.getenv(env_key, "").strip().rstrip("/")
        if extra_origin and extra_origin not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(extra_origin)

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


app.include_router(browser_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "browser-automation-sidecar"}
