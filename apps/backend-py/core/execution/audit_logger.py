import json
import os
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Basic file-based audit log for Phase 0. 
# Long term this will map to SQLite 'audit_logs' table.
LOG_FILE = Path(__file__).parent.parent.parent / "data" / "audit.log"

class AuditLogger:
    """
    Immutable audit trail for all executions across the OS.
    Answers the question: 'Why did the system do this 6 months ago?'
    """

    @staticmethod
    def log(agent: str, action: str, capability: str, risk: str, result: str, approved_by: str = None):
        entry = {
            "agent": agent,
            "action": action,
            "capability": capability,
            "risk": risk,
            "approved_by": approved_by,
            "timestamp": datetime.utcnow().isoformat(),
            "result": result
        }
        
        try:
            LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(LOG_FILE, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            logger.error(f"Failed to write to Audit Log: {e}")
