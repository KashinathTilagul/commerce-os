import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Callable

logger = logging.getLogger(__name__)

class CronJob:
    def __init__(self, name: str, interval_seconds: int, callback: Callable):
        self.name = name
        self.interval_seconds = interval_seconds
        self.callback = callback
        self.last_run = None
        self.is_running = False

    async def run(self):
        if self.is_running:
            return
        self.is_running = True
        try:
            logger.info(f"Triggering scheduled automation job: {self.name}")
            await self.callback()
            self.last_run = datetime.utcnow().isoformat()
        except Exception as e:
            logger.error(f"Error executing automation job {self.name}: {e}")
        finally:
            self.is_running = False

class AutomationScheduler:
    def __init__(self):
        self.jobs: Dict[str, CronJob] = {}
        self._loop_task = None
        self.is_active = False

    def schedule_job(self, name: str, interval_seconds: int, callback: Callable):
        self.jobs[name] = CronJob(name, interval_seconds, callback)
        logger.info(f"Scheduled cron job: {name} every {interval_seconds}s")

    async def start(self):
        if self.is_active:
            return
        self.is_active = True
        self._loop_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Automation Scheduler initialized and active.")

    async def stop(self):
        self.is_active = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass

    async def _scheduler_loop(self):
        while self.is_active:
            now = datetime.utcnow()
            for job in self.jobs.values():
                # Check if it has never run, or interval passed
                if not job.last_run:
                    asyncio.create_task(job.run())
                else:
                    last_run_dt = datetime.fromisoformat(job.last_run)
                    if (now - last_run_dt).total_seconds() >= job.interval_seconds:
                        asyncio.create_task(job.run())
            await asyncio.sleep(1)

# Global Scheduler
scheduler = AutomationScheduler()
