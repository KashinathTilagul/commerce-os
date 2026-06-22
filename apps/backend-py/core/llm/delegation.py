import logging
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class SubAgent:
    def __init__(self, agent_id: str, name: str, role: str, capabilities: List[str]):
        self.agent_id = agent_id
        self.name = name
        self.role = role
        self.capabilities = capabilities
        self.status = "IDLE"

    async def execute_task(self, task_description: str, task_context: Dict[str, Any] = None) -> Dict[str, Any]:
        self.status = "EXECUTING"
        logger.info(f"Sub-agent '{self.name}' ({self.role}) executing: {task_description}")
        
        # Simple task resolution simulator
        # In a fully agentic setup, we invoke LLMRouter with customized system instructions here.
        from core.agent.router import router
        system_prompt = f"You are {self.name}, the {self.role} agent for EKVAAR OS. Capabilities: {', '.join(self.capabilities)}"
        
        response = await router.route_request(
            prompt=task_description,
            system_prompt=system_prompt,
            task_type=self.role.lower()
        )
        
        self.status = "IDLE"
        return {
            "success": response.get("status") == "success",
            "agent_id": self.agent_id,
            "role": self.role,
            "response": response.get("message") or response.get("error"),
            "completed_at": datetime.utcnow().isoformat()
        }

class DelegationEngine:
    def __init__(self):
        self.registry: Dict[str, SubAgent] = {}
        self._bootstrap_delegates()

    def _bootstrap_delegates(self):
        # Default sub-agents corresponding to executive roles
        delegates = [
            SubAgent(str(uuid.uuid4()), "Pradhi", "Operations", ["restock", "inventory_policies"]),
            SubAgent(str(uuid.uuid4()), "Arindam", "Finance", ["budget_allocation", "sales_analysis"]),
            SubAgent(str(uuid.uuid4()), "Sujith", "Technology", ["code_execution", "system_checks"]),
            SubAgent(str(uuid.uuid4()), "Kartik", "Marketing", ["social_hub", "campaigns"])
        ]
        for d in delegates:
            self.registry[d.agent_id] = d

    def register_agent(self, name: str, role: str, capabilities: List[str]) -> str:
        agent_id = str(uuid.uuid4())
        self.registry[agent_id] = SubAgent(agent_id, name, role, capabilities)
        return agent_id

    async def delegate_work(self, capability: str, task_description: str) -> Dict[str, Any]:
        # Search for a sub-agent matching the requested capability
        for agent in self.registry.values():
            if capability in agent.capabilities:
                return await agent.execute_task(task_description)
        
        # Fallback to technology agent
        for agent in self.registry.values():
            if agent.role == "Technology":
                return await agent.execute_task(task_description)

        return {"success": False, "error": "No suitable agent found for delegation"}

# Global delegation engine
delegation_engine = DelegationEngine()
