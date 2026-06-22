import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "digital_employees")

ALLOWED_FILES = [
    "soul.md", "memory.md", "meta.json", "skill.md", "experience.md", 
    "metrics.md", "playbook.md", "capacity_model.md", "dashboard_architecture.md", 
    "data_model.md", "daily_brief_template.md", "weekly_report_template.md", "task_force_framework.md", "campaign_planning_framework.md", "workflow_management_framework.md", "budget_management_framework.md", "investment_review_framework.md", "brand_review_framework.md", "customer_retention_framework.md", "experimentation_framework.md", "revenue_optimization_framework.md", "chat_history.json",
    "contract_review_framework.md", "compliance_monitoring_framework.md", "governance_task_force_framework.md", "weekly_governance_report_template.md",
    "performance_review_framework.md", "promotion_framework.md", "workforce_planning_framework.md", "talent_task_force_framework.md"
]

class FileContent(BaseModel):
    content: str

@router.get("/digital_employees/{employee_id}/{file_name}")
async def get_employee_file(employee_id: str, file_name: str):
    if file_name not in ALLOWED_FILES:
        raise HTTPException(status_code=400, detail="Invalid file requested")
    
    file_path = os.path.join(BASE_DIR, employee_id, file_name)
    if not os.path.exists(file_path):
        return {"content": ""}
        
    with open(file_path, "r", encoding="utf-8") as f:
        return {"content": f.read()}

@router.post("/digital_employees/{employee_id}/{file_name}")
async def update_employee_file(employee_id: str, file_name: str, payload: FileContent):
    if file_name not in ALLOWED_FILES:
        raise HTTPException(status_code=400, detail="Invalid file requested")
        
    dir_path = os.path.join(BASE_DIR, employee_id)
    os.makedirs(dir_path, exist_ok=True)
    
    file_path = os.path.join(dir_path, file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(payload.content)
        
    return {"status": "success"}
