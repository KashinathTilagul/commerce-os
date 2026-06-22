"""
EKVAAR OS - Intelligence Layer: Prompt Assembly Engine
"""
from core.intelligence_layer.context_engine import ContextEngine

class PromptAssemblyEngine:
    @staticmethod
    async def build_prompt(employee_id: str, task_payload: str) -> str:
        """
        Structures the final string/messages array to be sent to the LLM.
        Prevents raw user inputs from going directly to the provider.
        """
        # Fetch dynamic context
        context = await ContextEngine.gather_context(employee_id, task_payload)
        
        # Assemble template
        prompt = f"""
        [SYSTEM CONTEXT]
        You are {employee_id} operating within EKVAAR OS.
        
        [FOUNDER CONTEXT]
        {context['founder_context']}
        
        [RELEVANT KNOWLEDGE]
        {context['knowledge_vault']}
        {context['protocols']}
        
        [HISTORY & DECISIONS]
        {context['previous_decisions']}
        
        [CURRENT TASK]
        {task_payload}
        """
        return prompt.strip()
