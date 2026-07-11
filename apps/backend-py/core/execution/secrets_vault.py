import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class SecretsVault:
    """Secure backend storage for API keys. Never leaks to frontend."""

    @staticmethod
    def get_composio_api_key() -> Optional[str]:
        key = os.environ.get("COMPOSIO_API_KEY")
        if not key:
            logger.warning("COMPOSIO_API_KEY not set.")
        return key
