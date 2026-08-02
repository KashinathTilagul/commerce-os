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
        profile_kwargs["user_data_dir"] = payload.user_data_dir

    return BrowserProfile(**profile_kwargs)


@router.post("/run")
async def run_browser_task(payload: BrowserRunRequest):
    if not os.getenv("BROWSER_USE_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="Browser automation needs BROWSER_USE_API_KEY or OPENAI_API_KEY configured.",
        )

    try:
        from browser_use import Agent

        try:
            from browser_use import ChatBrowserUse

            llm = ChatBrowserUse(model=os.getenv("BROWSER_USE_MODEL", "browser-use/bu-30b-a3b-preview"))
        except Exception:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=os.getenv("OPENAI_BROWSER_MODEL", os.getenv("OPENAI_MODEL", "gpt-4.1-mini")))

        target = f"Start at {payload.url}. " if payload.url else ""
        task = (
            f"{target}{payload.task}\n\n"
            "Return a concise JSON-compatible summary with actions taken, extracted facts, and blockers."
        )
        agent = Agent(task=task, llm=llm, browser_profile=_browser_profile(payload))
        history = await agent.run()
        return {
            "success": True,
            "agentCode": payload.agent_code,
            "device": payload.device,
            "result": _history_text(history),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
