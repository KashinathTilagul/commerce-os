import asyncio
from core.database import db_run, db_all
from core.services.task_service import task_service
from core.services.approval_service import approval_service
from core.services.objective_service import objective_service
from core.services.comms_service import comms_service

class MigrationService:
    @staticmethod
    async def migrate_tasks():
        old_count = 0
        new_count = 0
        
        # 1. migrate `omega_tasks`
        try:
            omega = await db_all("SELECT * FROM omega_tasks")
            for t in omega:
                old_count += 1
                await task_service.create_task(
                    title=t.get("title", "Untitled Omega Task"),
                    description=f"Legacy Omega Task from project {t.get('project_id')}",
                    owner=t.get("owner", "system"),
                    status=t.get("status", "PENDING"),
                    context="omega",
                    priority="HIGH" if t.get("revenue_impact", 0) > 0 else "NORMAL"
                )
                new_count += 1
        except Exception: pass

        # 2. migrate `workforce_tasks`
        try:
            workforce = await db_all("SELECT * FROM workforce_tasks")
            for t in workforce:
                old_count += 1
                await task_service.create_task(
                    title=t.get("title", "Untitled Workforce Task"),
                    description=t.get("payload_json", ""),
                    owner=t.get("assigned_to", "system"),
                    status=t.get("status", "PENDING"),
                    context="workforce",
                    priority="NORMAL"
                )
                new_count += 1
        except Exception: pass
            
        # 3. migrate `tasks`
        try:
            tasks = await db_all("SELECT * FROM tasks")
            for t in tasks:
                old_count += 1
                await task_service.create_task(
                    title=t.get("title", "Untitled System Task"),
                    description=t.get("description", ""),
                    owner=t.get("assigned_to", "system"),
                    status=t.get("status", "PENDING"),
                    context="legacy",
                    priority="NORMAL"
                )
                new_count += 1
        except Exception: pass

        return old_count, new_count

    @staticmethod
    async def migrate_approvals():
        old_count = 0
        new_count = 0

        # 1. approval_queue
        try:
            aq = await db_all("SELECT * FROM approval_queue")
            for a in aq:
                old_count += 1
                await approval_service.queue_approval(
                    title=f"Approval for {a.get('agent_id')}",
                    description=f"Action: {a.get('action')}, Capability: {a.get('capability')}",
                    context="automation",
                    requester=a.get("agent_id", "system"),
                    risk=a.get("risk", "LOW"),
                    cost=float(a.get("cost", 0.0))
                )
                new_count += 1
        except Exception: pass

        # 2. production_decision_queue
        try:
            pdq = await db_all("SELECT * FROM production_decision_queue")
            for p in pdq:
                old_count += 1
                await approval_service.queue_approval(
                    title=f"Decision from {p.get('agent')}",
                    description=p.get("description", ""),
                    context="production",
                    requester=p.get("agent", "system"),
                    risk="HIGH" if float(p.get("risk", 0.0)) > 0.7 else "LOW",
                    cost=0.0
                )
                new_count += 1
        except Exception: pass

        # 3. founder_decisions
        try:
            fd = await db_all("SELECT * FROM founder_decisions")
            for f in fd:
                old_count += 1
                await approval_service.queue_approval(
                    title=f"Founder Decision: {f.get('context')}",
                    description=f.get("decision", ""),
                    context="founder_memory",
                    requester="founder",
                    risk="LOW",
                    cost=0.0
                )
                new_count += 1
        except Exception: pass

        return old_count, new_count

    @staticmethod
    async def migrate_objectives():
        old_count = 0
        new_count = 0

        # 1. missions
        try:
            missions = await db_all("SELECT * FROM missions")
            for m in missions:
                old_count += 1
                await objective_service.create_objective(
                    title=m.get("name", "Untitled Mission"),
                    description=m.get("objective", ""),
                    target_date=None
                )
                new_count += 1
        except Exception: pass
            
        return old_count, new_count

    @staticmethod
    async def migrate_communications():
        old_count = 0
        new_count = 0

        # 1. workforce_escalations
        try:
            we = await db_all("SELECT * FROM workforce_escalations")
            for w in we:
                old_count += 1
                await comms_service.escalate_issue(
                    title=w.get("issue_type", "Escalation"),
                    description=w.get("context_json", ""),
                    sender=w.get("agent_id", "system"),
                    recipient="founder",
                    severity="HIGH"
                )
                new_count += 1
        except Exception: pass

        return old_count, new_count

    @staticmethod
    async def run_all_migrations():
        # Clear target tables first to ensure idempotent migration
        await db_run("DELETE FROM system_tasks")
        await db_run("DELETE FROM system_approvals")
        await db_run("DELETE FROM system_objectives")
        await db_run("DELETE FROM system_communications")

        t_old, t_new = await MigrationService.migrate_tasks()
        a_old, a_new = await MigrationService.migrate_approvals()
        o_old, o_new = await MigrationService.migrate_objectives()
        c_old, c_new = await MigrationService.migrate_communications()

        return {
            "Tasks": {"Old Count": t_old, "New Count": t_new},
            "Approvals": {"Old Count": a_old, "New Count": a_new},
            "Objectives": {"Old Count": o_old, "New Count": o_new},
            "Communications": {"Old Count": c_old, "New Count": c_new}
        }
