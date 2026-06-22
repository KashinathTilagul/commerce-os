import uuid
from datetime import datetime, timezone
from core.database import db_run, db_all
from core.services.task_service import task_service
import json

class ExecutionEngine:
    @staticmethod
    async def get_all_tasks():
        return await task_service.get_all_tasks(500)
