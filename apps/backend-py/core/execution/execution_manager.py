import logging
from typing import List, Dict, Any
from .action_schema import ToolRequest, ExecutionResult
from .adapter_interface import ToolAdapterInterface

from .audit_logger import AuditLogger
from core.automation.risk_registry import RiskRegistry, RiskLevel
from core.automation.policy_engine import PolicyEngine
from core.automation.approval_queue import ApprovalQueue

logger = logging.getLogger(__name__)

class ExecutionManager:
    """
    The orchestrator. Receives action requests from the LLM router, applies governance,
    and dispatches them to the appropriate Tool Adapter.
    """
    def __init__(self):
        # Register adapters
        self.adapters: List[ToolAdapterInterface] = []

    async def get_tools_for_agent(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves the list of tools available to the agent, filtered by their granted capabilities.
        """
        all_tools = []
        for adapter in self.adapters:
            all_tools.extend(adapter.list_tools())
        
        # In a fully mature system, we would filter all_tools by checking PolicyEngine
        # For Phase 2 implementation, we pass them up, and rely on ExecutionManager handle_request
        # to strictly block unauthorized executions via PolicyEngine.
        return all_tools

    async def handle_request(self, request: ToolRequest) -> ExecutionResult:
        """
        Process an incoming execution request through strict governance policies.
        """
        risk = RiskRegistry.get_risk(request.capability_required)
        # Cost extraction (assuming parameters might contain a 'cost' or 'amount' key for financial actions)
        cost = float(request.parameters.get("amount", 0.0) or request.parameters.get("cost", 0.0))

        # 1. Policy Engine: Check Capability
        has_cap = await PolicyEngine.check_capability(request.agent_id, request.capability_required)
        if not has_cap:
            AuditLogger.log(request.agent_id, request.tool_name, request.capability_required, risk.value, "REJECTED_NO_CAPABILITY")
            return ExecutionResult(status="FAILED", message=f"Agent lacks capability: {request.capability_required}")

        # 2. Policy Engine: Evaluate Budget
        budget_approved, budget_reason = await PolicyEngine.evaluate_budget(request.agent_id, cost)

        # 3. Risk Assessment & Approval Routing
        if not budget_approved or risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            # Escalate to Founder
            req_id = await ApprovalQueue.create_request(
                agent_id=request.agent_id,
                action=request.tool_name,
                capability=request.capability_required,
                risk=risk.value,
                cost=cost,
                context=request.parameters
            )
            AuditLogger.log(request.agent_id, request.tool_name, request.capability_required, risk.value, f"ESCALATED ({req_id})")
            return ExecutionResult(
                status="PENDING_APPROVAL", 
                message=f"Action escalated to Founder queue. Risk: {risk.value}. Budget status: {budget_reason}",
                data={"approval_request_id": req_id}
            )

        # 4. Auto-Approve & Execute via Adapter
        # No adapters loaded
        return ExecutionResult(status="FAILED", message="No integration adapters available.")
        logger.info(f"Executing {request.tool_name} via {adapter.get_name()}")
        result = await adapter.execute(request)
        
        # 5. Post-Execution Accounting & Logging
        if result.status == "SUCCESS":
            await PolicyEngine.commit_spend(request.agent_id, cost)

        AuditLogger.log(
            agent=request.agent_id,
            action=request.tool_name,
            capability=request.capability_required,
            risk=risk.value,
            result=result.status
        )

        return result
