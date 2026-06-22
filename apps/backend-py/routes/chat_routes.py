from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from core.llm.router import LLMRouter
from core.services import (
    task_service, 
    revenue_service, 
    cash_service,
    approval_service,
)

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[list] = None

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Centralized chat endpoint — all agent UIs route through here."""
    try:
        # Gather live system state from shared services
        tasks = await task_service.get_all_tasks(10)
        revenue = await revenue_service.get_recent_revenue(1)
        cash = await cash_service.get_current_cash()
        approvals = await approval_service.get_pending_approvals()
        
        system_prompt = (
            "You are Krishna, the CEO intelligence of EKVAAR OS. "
            "You have full visibility into the company. "
            f"Current System State: "
            f"{len(tasks)} active tasks. "
            f"Latest Revenue: {revenue[0]['amount'] if revenue else 'No data yet'}. "
            f"Cash Position: {cash['cash_available'] if cash else 'No data yet'}. "
            f"Pending Approvals: {len(approvals)}. "
            "Answer concisely and actionably."
        )
        
        # Build history string from context
        history_str = ""
        if request.history:
            history_str = "Recent Conversation History:\n"
            for msg in request.history:
                # Exclude the current prompt which is added at the end
                if msg.get('text') == request.prompt and msg == request.history[-1]:
                    continue
                role = "User" if msg.get("role") == "user" else "Krishna"
                history_str += f"{role}: {msg.get('text')}\n"
            history_str += "\n"
        
        llm = LLMRouter()
        response = await llm.route_request(
            prompt=f"{history_str}User: {request.prompt}",
            system_prompt=system_prompt,
            task_type="ceo"
        )
        
        if response.get("status") == "success":
            return {"reply": response["message"]}
        else:
            return {"reply": response.get("message", "LLM unavailable. No API key configured.")}
    except Exception as e:
        return {"reply": f"Error connecting to central brain: {str(e)}"}

