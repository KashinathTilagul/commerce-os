import { runAllBusyAgents } from './agent-worker'

// In-process auto-scheduler: digital employees work their open tickets on a
// timer — no manual "Work" button, no external cron.
//
// ponytail: single long-lived container assumption. If ever horizontally scaled,
// gate behind a leader lock so only one instance runs the interval.

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
      const n = await runAllBusyAgents()
    } catch (e: any) {
      console.error('[scheduler] error:', e?.message || e)
    } finally {
      running = false
    }
  }

  setTimeout(tick, 60_000)   // first pass shortly after boot
  setInterval(tick, EVERY_MS)
}
