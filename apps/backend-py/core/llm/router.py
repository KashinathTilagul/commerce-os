import os
import json
import logging
from typing import Dict, Any

from openai import AsyncOpenAI

try:
    import boto3
    _bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-east-1'))
except Exception:
    _bedrock = None

from core.execution.execution_manager import ExecutionManager
from core.execution.action_schema import ToolRequest

logger = logging.getLogger(__name__)

BEDROCK_MODEL = os.getenv('BEDROCK_MODEL_ID', 'amazon.nova-pro-v1:0')

OPENROUTER_MODELS = [
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'qwen/qwen3-235b-a22b:free',
    'qwen/qwen3-coder:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
]

GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama3-8b-8192',
    'gemma2-9b-it',
]

_openrouter = AsyncOpenAI(
    api_key=os.getenv('OPENROUTER_API_KEY', ''),
    base_url='https://openrouter.ai/api/v1',
) if os.getenv('OPENROUTER_API_KEY') else None

_groq = AsyncOpenAI(
    api_key=os.getenv('GROQ_API_KEY', ''),
    base_url='https://api.groq.com/openai/v1',
) if os.getenv('GROQ_API_KEY') else None


class LLMRouter:
    def __init__(self):
        self.execution_manager = ExecutionManager()

    async def route_request(self, prompt: str, system_prompt: str = None, task_type: str = 'general') -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        available_tools = await self.execution_manager.get_tools_for_agent(task_type)
        tool_kwargs = {'tools': available_tools} if available_tools else {}

        # 1. Bedrock (primary)
        if _bedrock:
            try:
                kwargs: Dict[str, Any] = dict(
                    modelId=BEDROCK_MODEL,
                    messages=[{'role': 'user', 'content': [{'text': prompt}]}],
                    inferenceConfig={'maxTokens': 512, 'temperature': 0.7},
                )
                if system_prompt:
                    kwargs['system'] = [{'text': system_prompt}]
                resp = _bedrock.converse(**kwargs)
                text = resp['output']['message']['content'][0]['text']
                return {'status': 'success', 'provider': 'bedrock', 'model': BEDROCK_MODEL, 'message': text}
            except Exception as e:
                logger.warning(f'Bedrock failed ({BEDROCK_MODEL}): {e} — falling back to OpenRouter')

        # 2. OpenRouter free models
        if _openrouter:
            for model in OPENROUTER_MODELS:
                try:
                    response = await _openrouter.chat.completions.create(
                        model=model, messages=messages, **tool_kwargs
                    )
                    return await self._handle_response(response, messages, model, 'openrouter', tool_kwargs, _openrouter)
                except Exception as e:
                    logger.warning(f'OpenRouter {model} failed: {e}')
                    continue

        # 3. Groq final fallback
        if _groq:
            for model in GROQ_MODELS:
                try:
                    response = await _groq.chat.completions.create(model=model, messages=messages)
                    return await self._handle_response(response, messages, model, 'groq', {}, _groq)
                except Exception as e:
                    logger.warning(f'Groq {model} failed: {e}')
                    continue

        return {'status': 'error', 'message': 'All providers failed. Check IAM role, OPENROUTER_API_KEY, and GROQ_API_KEY.'}

    async def _handle_response(self, response, messages, model, provider, tool_kwargs, client) -> Dict[str, Any]:
        msg = response.choices[0].message
        if not msg.tool_calls:
            return {'status': 'success', 'provider': provider, 'model': model, 'message': msg.content}

        messages.append(msg)
        for tc in msg.tool_calls:
            req = ToolRequest(
                agent_id='general',
                tool_name=tc.function.name,
                parameters=json.loads(tc.function.arguments),
                capability_required=tc.function.name,
            )
            result = await self.execution_manager.handle_request(req)
            messages.append({
                'tool_call_id': tc.id,
                'role': 'tool',
                'name': tc.function.name,
                'content': json.dumps({'status': result.status, 'message': result.message, 'data': result.data}),
            })
        final = await client.chat.completions.create(model=model, messages=messages)
        return {'status': 'success', 'provider': provider, 'model': model, 'message': final.choices[0].message.content}


router = LLMRouter()
