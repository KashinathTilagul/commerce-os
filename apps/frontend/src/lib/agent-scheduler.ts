import { runAllBusyAgents } from './agent-worker'
import { withSchedulerLock } from './scheduler-lock'

// In-process auto-scheduler: digital employees work their open tickets on a
// timer — no manual "Work" button, no external cron.
//
// Shared Redis lease prevents simultaneous sweeps across app instances.

let started = false

export function startAgentScheduler() {
  if (started || process.env.DISABLE_AGENT_SCHEDULER === '1') return
  started = true

  const EVERY_MS = 5 * 60 * 1000 // every 5 minutes
  let running = false

  const tick = async () => {
    if (running) return // never overlap runs
    running = true
    try {
      await withSchedulerLock('agents', async () => {
      await runAllBusyAgents()
      // Evaluate periodic autonomous playbooks ("Hands")
      const { runPlaybookSweep } = await import('./agent-playbooks')
      await runPlaybookSweep()
      })
    } catch (e: any) {
      console.error('[scheduler] error:', e?.message || e)
    } finally {
      running = false
    }
  }

  setTimeout(tick, 60_000)   // first pass shortly after boot
  setInterval(tick, EVERY_MS)
}
