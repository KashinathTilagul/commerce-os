import os
import json
import logging
from typing import Dict, Any

import boto3

from core.execution.execution_manager import ExecutionManager
from core.execution.action_schema import ToolRequest

logger = logging.getLogger(__name__)

MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'amazon.nova-pro-v1:0')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

try:
    _bedrock = boto3.client('bedrock-runtime', region_name=AWS_REGION)
except Exception as e:
    _bedrock = None
    logger.error(f"Bedrock client init failed: {e}")


class LLMRouter:
    def __init__(self):
        self.execution_manager = ExecutionManager()

    async def route_request(self, prompt: str, system_prompt: str = None, task_type: str = "general") -> Dict[str, Any]:
        if not _bedrock:
            return {"status": "error", "message": "Bedrock client unavailable — check IAM role or AWS_REGION."}

        try:
            kwargs: Dict[str, Any] = dict(
                modelId=MODEL_ID,
                messages=[{'role': 'user', 'content': [{'text': prompt}]}],
                inferenceConfig={'maxTokens': 512, 'temperature': 0.7},
            )
            if system_prompt:
                kwargs['system'] = [{'text': system_prompt}]

            resp = _bedrock.converse(**kwargs)
            text = resp['output']['message']['content'][0]['text']
            return {'status': 'success', 'provider': 'bedrock', 'model': MODEL_ID, 'message': text}
        except Exception as e:
            logger.error(f"Bedrock request failed: {e}")
            return {"status": "error", "message": str(e)}


router = LLMRouter()
