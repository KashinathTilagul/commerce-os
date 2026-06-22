from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class ToolRequest(BaseModel):
    """Schema representing a standardized request to execute an action."""
    agent_id: str
    tool_name: str
    parameters: Dict[str, Any]
    capability_required: str
    request_timestamp: str = datetime.utcnow().isoformat()

class ExecutionResult(BaseModel):
    """Schema representing the standardized result of an execution attempt."""
    status: str # 'SUCCESS', 'FAILED', 'PENDING_APPROVAL'
    message: str
    data: Optional[Any] = None
    execution_timestamp: str = datetime.utcnow().isoformat()
