import { runAllBusyAgents } from './agent-worker'
import { withSchedulerLock } from './scheduler-lock'

// In-process auto-scheduler: digital employees work their open tickets on a
// timer — no manual "Work" button, no external cron.
//
// Shared Redis lease prevents simultaneous sweeps across app instances.

let started = false

export function startAgentScheduler() {
  // On Vercel (serverless) timers don't survive; /api/cron/agents runs the sweep instead.
  if (started || process.env.DISABLE_AGENT_SCHEDULER === '1' || process.env.VERCEL) return
  started = true

  const EVERY_MS = 5 * 60 * 1000 // every 5 minutes
  let running = false

  const tick = async () => {
    if (running) return // never overlap runs
    running = true
    try {
      await runAgentSweep()
    } catch (e: any) {
      console.error('[scheduler] error:', e?.message || e)
    } finally {
      running = false
    }
  }

  setTimeout(tick, 60_000)   // first pass shortly after boot
  setInterval(tick, EVERY_MS)
}

// One scheduler pass: busy agents work their tickets, then periodic playbooks run.
// Shared by the in-process timer and the /api/cron/agents route.
export async function runAgentSweep() {
  return withSchedulerLock('agents', async () => {
    await runAllBusyAgents()
    const { runPlaybookSweep } = await import('./agent-playbooks')
    await runPlaybookSweep()
    return true
  })
}
