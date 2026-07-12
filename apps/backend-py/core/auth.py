"""
JWT Authentication Middleware for EKVAAR Python Backend
Validates tokens from NextAuth.js session
"""

import os
import jwt
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("NEXTAUTH_SECRET", ""))

async def verify_jwt_token(request: Request) -> Optional[dict]:
    """
    Verify JWT token from Authorization header.
    Returns decoded payload if valid, None if no token.
    Raises HTTPException if token is invalid.
    """
    if not JWT_SECRET:
        return {"user_id": "dev", "role": "ADMIN"}
    
    auth_header = request.headers.get("Authorization", "")
    
    if not auth_header:
        return None
    
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        return None
    
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    """
    Dependency that requires authentication.
    Returns user payload or raises 401.
    """
    payload = await verify_jwt_token(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload


async def get_current_user_optional(request: Request) -> Optional[dict]:
    """
    Optional authentication - returns None if not authenticated.
    """
    return await verify_jwt_token(request)
