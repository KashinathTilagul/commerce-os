import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class SecretsVault:
    """Secure backend key storage. Never leaks to frontend."""

    @staticmethod
    def get_composio_api_key() -> Optional[str]:
        key = os.environ.get("COMPOSIO_API_KEY")
        if not key:
            logger.warning("COMPOSIO_API_KEY not set.")
        return key

    @staticmethod
    def get_openrouter_api_key() -> Optional[str]:
        return os.environ.get("OPENROUTER_API_KEY")

    @staticmethod
    def get_groq_api_key() -> Optional[str]:
        return os.environ.get("GROQ_API_KEY")
