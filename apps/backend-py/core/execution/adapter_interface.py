from abc import ABC, abstractmethod
from typing import Any, Dict, List
from .action_schema import ToolRequest, ExecutionResult

class ToolAdapterInterface(ABC):
    """
    Abstract interface for executing tools.
    Decouples the Execution Manager from the specific integration provider (Composio, MCP, Browser, etc.)
    """

    @abstractmethod
    def get_name(self) -> str:
        """Returns the name of the adapter."""
        pass

    @abstractmethod
    def list_tools(self) -> List[Dict[str, Any]]:
        """Returns the list of tools provided by this adapter, formatted for the LLM."""
        pass

    @abstractmethod
    async def execute(self, request: ToolRequest) -> ExecutionResult:
        """Executes the specific tool."""
        pass
