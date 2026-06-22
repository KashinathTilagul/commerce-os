from typing import Dict, Any, Optional

class IntegrationRegistry:
    """
    The Single Source of Truth for all available integrations.
    Maps actual tools (from Composio, MCP, etc.) to generic EKVAAR OS capabilities.
    """
    
    # Static registry for phase 0 mapping. Eventually this should be dynamic/DB-backed.
    _registry: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_all(cls) -> Dict[str, Any]:
        return cls._registry

    @classmethod
    def get_integration(cls, key: str) -> Optional[Dict[str, Any]]:
        return cls._registry.get(key)
