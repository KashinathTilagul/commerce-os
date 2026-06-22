import os
import json
import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from core.execution.execution_manager import ExecutionManager
from core.execution.action_schema import ToolRequest
from core.execution.secrets_vault import SecretsVault
from core.execution.integration_registry import IntegrationRegistry

logger = logging.getLogger(__name__)

# Free fallback models from OpenRouter — fast/reliable models first
FALLBACK_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-coder:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
]

class LLMRouter:
    def __init__(self):
        # We use the official OpenAI SDK, compatible with Groq and OpenRouter.
        provider = SecretsVault.get_llm_provider()
        self.api_key = SecretsVault.get_any_llm_key()
        
        base_url = "https://api.openai.com/v1"
        if provider == "openrouter":
            base_url = "https://openrouter.ai/api/v1"
        elif provider == "groq":
            base_url = "https://api.groq.com/openai/v1"
        
        self.provider = provider
        # We safely initialize client if API key is present
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url) if self.api_key else None
        self.execution_manager = ExecutionManager()

    async def route_request(self, prompt: str, system_prompt: str = None, task_type: str = "general") -> Dict[str, Any]:
        if not self.client:
            return {"status": "error", "message": "No valid LLM API key available. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in your .env file."}

        # Select models based on provider
        if self.provider == "openai":
            models_to_try = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
        elif self.provider == "groq":
            models_to_try = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma-7b-it"]
        else:  # openrouter or fallback
            models_to_try = FALLBACK_MODELS
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # 1. Fetch available tools for this agent from the Execution Manager
        agent_id = task_type
        available_tools = await self.execution_manager.get_tools_for_agent(agent_id)
        
        kwargs = {}
        if available_tools:
            kwargs["tools"] = available_tools

        last_error = None

        # Retry loop using fallback models
        for model in models_to_try:
            try:
                logger.info(f"Routing task '{task_type}' to {model} (provider: {self.provider}) with {len(available_tools)} tools.")
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs
                )
                
                response_message = response.choices[0].message
                
                # 2. Check if the LLM wants to execute a tool (Agent proposes action)
                if response_message.tool_calls:
                    messages.append(response_message)
                    
                    for tool_call in response_message.tool_calls:
                        function_name = tool_call.function.name
                        function_args = json.loads(tool_call.function.arguments)
                        
                        # 3. Pass the proposed action to the Execution Manager (Governance Layer)
                        req = ToolRequest(
                            agent_id=agent_id,
                            tool_name=function_name,
                            parameters=function_args,
                            capability_required=function_name # Fallback capability mapping
                        )
                        
                        # Execution Manager handles Policy, Budgets, Approvals, and Execution
                        exec_result = await self.execution_manager.handle_request(req)
                        
                        # 4. Return result to the LLM Context
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps({"status": exec_result.status, "message": exec_result.message, "data": exec_result.data})
                        })
                    
                    # 5. Final LLM call to summarize the real-world action result
                    second_response = await self.client.chat.completions.create(
                        model=model,
                        messages=messages
                    )
                    final_content = second_response.choices[0].message.content
                    return {
                        "status": "success",
                        "provider": "openai_sdk",
                        "model": model,
                        "message": final_content
                    }
                else:
                    return {
                        "status": "success",
                        "provider": "openai_sdk",
                        "model": model,
                        "message": response_message.content
                    }
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}. Trying next fallback...")
                last_error = e
                continue # Try the next model
                
        logger.error(f"All fallback models failed. Last error: {last_error}")
        return {
            "status": "error",
            "message": f"All fallback models failed. Last error: {str(last_error)}"
        }

router = LLMRouter()
