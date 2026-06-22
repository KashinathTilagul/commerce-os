"""
EKVAAR OS - Intelligence Layer: Tool Executor
"""
from core.intelligence_layer.capability_mapper import CapabilityMapper
from core.intelligence_layer.tool_registry import ToolRegistry
from core.execution_governance.runtime_guardrails import RuntimeGuardrails
from core.intelligence_layer.provider_audit import ProviderAudit

class ToolExecutor:
    @staticmethod
    async def execute_tool(employee_id: str, tool_name: str, payload: dict, department: str) -> dict:
        """
        Executes a registered tool. Follows strict governance flow.
        """
        # 1. Capability Permission Check
        has_cap = await CapabilityMapper.check_capability(employee_id, tool_name)
        if not has_cap:
            return {"status": "ERROR", "reason": f"Employee {employee_id} lacks capability for tool {tool_name}."}
            
        # 2. Check if Tool Exists
        tool = await ToolRegistry.get_tool(tool_name)
        if not tool:
            return {"status": "ERROR", "reason": f"Tool {tool_name} not found in registry."}

        # 3. Governance Guardrails (Action = EXECUTE since we are calling an active tool)
        guardrail_check = await RuntimeGuardrails.validate_execution(
            employee_id=employee_id,
            action="EXECUTE",
            department=department,
            estimated_cost=0.0, # Internal tools are free, external APIs incur cost later
            risk_level="STANDARD"
        )
        if not guardrail_check["allowed"]:
            return {"status": "ERROR", "reason": guardrail_check["reason"]}
            
        # 4. Execute (Simulated)
        result = f"Simulated output from {tool_name}"
        
        # 5. Audit
        await ProviderAudit.log_call(
            task_id="tool_exec",
            capability_id=tool["id"],
            provider_id="LOCAL",
            cost=0.0,
            latency_ms=10,
            was_successful=True
        )
        
        return {"status": "SUCCESS", "output": result}
