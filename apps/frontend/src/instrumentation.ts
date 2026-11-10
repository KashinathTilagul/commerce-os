// Next.js server-boot hook. Loads the agent auto-scheduler only in self-hosted
// Node runtimes (Vercel serverless uses /api/cron/agents instead, so skip tracing it there).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    !process.env.VERCEL &&
    process.env.DISABLE_AGENT_SCHEDULER !== '1'
  ) {
    const { startAgentScheduler } = await import('@/lib/agent-scheduler')
    startAgentScheduler()
  }
}
