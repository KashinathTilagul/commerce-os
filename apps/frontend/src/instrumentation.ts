// Next.js server-boot hook. Loads the agent auto-scheduler only in the Node
// runtime (the scheduler pulls Prisma/node built-ins that the edge bundle lacks).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAgentScheduler } = await import('@/lib/agent-scheduler')
    startAgentScheduler()
  }
}
