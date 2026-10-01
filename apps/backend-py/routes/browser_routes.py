import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/browser", tags=["browser"])


class BrowserRunRequest(BaseModel):
    task: str = Field(..., min_length=3, max_length=4000)
    url: str | None = Field(default=None, max_length=2048)
    agent_code: str | None = Field(default=None, max_length=80)
    device: str = Field(default="desktop", pattern="^(desktop|mobile)$")
    browser_channel: str | None = Field(default=None, max_length=40)
    viewport_width: int | None = Field(default=None, ge=320, le=3840)
    viewport_height: int | None = Field(default=None, ge=480, le=2160)
    user_agent: str | None = Field(default=None, max_length=512)
    user_data_dir: str | None = Field(default=None, max_length=1024)
    ai_provider: str | None = Field(default=None, max_length=80)
    ai_model: str | None = Field(default=None, max_length=240)
    ai_api_key: str | None = Field(default=None, max_length=4096)
    ai_base_url: str | None = Field(default=None, max_length=2048)


def _history_text(history: object) -> str:
    if hasattr(history, "final_result"):
        result = history.final_result()
        if result:
            return str(result)
    return str(history)


def _browser_profile(payload: BrowserRunRequest):
    from browser_use.browser.profile import BrowserProfile

    is_mobile = payload.device == "mobile"
    width = payload.viewport_width or (390 if is_mobile else 1440)
    height = payload.viewport_height or (844 if is_mobile else 1000)
    user_agent = payload.user_agent

    if is_mobile and not user_agent:
        user_agent = (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )

    profile_kwargs = {
        "viewport": {"width": width, "height": height},
        "screen": {"width": width, "height": height},
        "device_scale_factor": 3 if is_mobile else 1,
        "user_agent": user_agent,
        "headless": os.getenv("BROWSER_HEADLESS", "true").lower() != "false",
    }

    if payload.browser_channel:
        profile_kwargs["channel"] = payload.browser_channel
    if payload.user_data_dir:
        raise HTTPException(status_code=400, detail='Custom browser profiles are not allowed')

    return BrowserProfile(**profile_kwargs)


def _has_bedrock_credentials(payload: BrowserRunRequest) -> bool:
    return bool(
        (payload.ai_provider in {"bedrock", "amazon-bedrock"} and payload.ai_api_key)
        or os.getenv("AWS_BEARER_TOKEN_BEDROCK")
        or os.getenv("BEDROCK_API_KEY")
        or (os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))
    )


def _browser_llm(payload: BrowserRunRequest):
    provider = (payload.ai_provider or "").lower()
    model = payload.ai_model
    api_key = payload.ai_api_key

    if provider in {"bedrock", "amazon-bedrock"} and api_key:
        raise HTTPException(status_code=400, detail='Per-request Bedrock bearer keys are unsupported; configure isolated worker credentials')

    if api_key:
        from langchain_openai import ChatOpenAI

        provider_base_urls = {
            "openrouter": "https://openrouter.ai/api/v1",
            "groq": "https://api.groq.com/openai/v1",
        }
        return ChatOpenAI(
            api_key=api_key,
            base_url=payload.ai_base_url or provider_base_urls.get(provider),
            model=model or os.getenv("OPENAI_BROWSER_MODEL", os.getenv("OPENAI_MODEL", "gpt-4.1-mini")),
        )

    if os.getenv("BROWSER_USE_API_KEY"):
        from browser_use import ChatBrowserUse

        return ChatBrowserUse(model=os.getenv("BROWSER_USE_MODEL", "browser-use/bu-30b-a3b-preview"))

    if os.getenv("OPENAI_API_KEY"):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=os.getenv("OPENAI_BROWSER_MODEL", os.getenv("OPENAI_MODEL", "gpt-4.1-mini")))

    if _has_bedrock_credentials(payload):
        from langchain_aws import ChatBedrockConverse

        model = os.getenv("BROWSER_BEDROCK_MODEL", os.getenv("BEDROCK_MODEL_ID", "zai.glm-5"))
        return ChatBedrockConverse(
            model=model.replace("amazon-bedrock/", ""),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )

    raise HTTPException(
        status_code=503,
        detail="Browser automation needs an AI key saved in Settings or a browser AI env key configured.",
    )


@router.post("/run")
async def run_browser_task(payload: BrowserRunRequest):
    try:
        from browser_use import Agent

        target = f"Start at {payload.url}. " if payload.url else ""
        task = (
            f"{target}{payload.task}\n\n"
            "Return a concise JSON-compatible summary with actions taken, extracted facts, and blockers."
        )
        agent = Agent(task=task, llm=_browser_llm(payload), browser_profile=_browser_profile(payload))
        history = await agent.run()
        return {
            "success": True,
            "agentCode": payload.agent_code,
            "device": payload.device,
            "result": _history_text(history),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
