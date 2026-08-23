"""
EKVAAR OS — Python Sidecar (FastAPI)
Serves browser automation capabilities that require the Python runtime.
Business data and application APIs live in the Next.js/Prisma app.
"""

import os
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


app.include_router(browser_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "browser-automation-sidecar"}
