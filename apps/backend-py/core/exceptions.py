"""
core.exceptions – Centralized exception classes for EKVAAR OS.
All custom exceptions inherit from EkvaarException for consistent error handling.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EkvaarException(Exception):
    """Base exception for all EKVAAR OS errors."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        logger.error(f"[{code}] {message}", extra=self.details)
        super().__init__(message)


class DatabaseError(EkvaarException):
    """Database operation failed."""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__("DATABASE_ERROR", message, 500, details)


class ValidationError(EkvaarException):
    """Input validation failed."""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__("VALIDATION_ERROR", message, 400, details)


class PathTraversalError(ValidationError):
    """Path traversal attack attempted."""
    def __init__(self, attempted_path: str):
        super().__init__(
            "Invalid path component",
            {"attempted_path": attempted_path}
        )


class ResourceNotFound(EkvaarException):
    """Requested resource does not exist."""
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            "RESOURCE_NOT_FOUND",
            f"{resource_type} not found: {resource_id}",
            404,
            {"resource_type": resource_type, "resource_id": resource_id}
        )


class AuthenticationError(EkvaarException):
    """Authentication failed."""
    def __init__(self, message: str = "Authentication required"):
        super().__init__("AUTH_ERROR", message, 401)


class PermissionError(EkvaarException):
    """User lacks required permissions."""
    def __init__(self, message: str = "Permission denied"):
        super().__init__("PERMISSION_DENIED", message, 403)


class InboxError(EkvaarException):
    """Inbox operation failed."""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__("INBOX_ERROR", message, 400, details)


class LLMRoutingError(EkvaarException):
    """LLM routing or inference failed."""
    def __init__(self, message: str, provider: Optional[str] = None):
        super().__init__(
            "LLM_ROUTING_ERROR",
            message,
            502,
            {"provider": provider} if provider else {}
        )


class IntegrationError(EkvaarException):
    """External service integration failed."""
    def __init__(self, service: str, message: str):
        super().__init__(
            "INTEGRATION_ERROR",
            f"{service}: {message}",
            502,
            {"service": service}
        )
