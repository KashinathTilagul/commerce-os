import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SecretsVault:
    """
    Secure backend storage for API keys and OAuth secrets.
    Ensures keys never leak to the frontend.
    """
    @staticmethod
    def get_composio_api_key() -> Optional[str]:
        key = os.environ.get("COMPOSIO_API_KEY")
        if not key:
            logger.warning("COMPOSIO_API_KEY not found in environment variables.")
        return key

    @staticmethod
    def get_openai_api_key() -> Optional[str]:
        return os.environ.get("OPENAI_API_KEY")

    @staticmethod
    def get_openrouter_api_key() -> Optional[str]:
        key = os.environ.get("OPENROUTER_API_KEY")
        if not key:
            logger.warning("OPENROUTER_API_KEY not found in environment variables.")
        return key

    @staticmethod
    def get_groq_api_key() -> Optional[str]:
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            logger.warning("GROQ_API_KEY not found in environment variables.")
        return key

    @staticmethod
    def get_any_llm_key() -> Optional[str]:
        """Get any available LLM API key in order of preference"""
        return (
            os.environ.get("OPENAI_API_KEY") or
            os.environ.get("OPENROUTER_API_KEY") or
            os.environ.get("GROQ_API_KEY")
        )

    @staticmethod
    def get_llm_provider() -> Optional[str]:
        """Determine which LLM provider is available"""
        if os.environ.get("OPENAI_API_KEY"):
            return "openai"
        elif os.environ.get("OPENROUTER_API_KEY"):
            return "openrouter"
        elif os.environ.get("GROQ_API_KEY"):
            return "groq"
        else:
            logger.warning("No LLM API key found in environment variables.")
            return None
