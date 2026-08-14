export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// Workforce Engine — spawns, governs, and terminates specialized agents
export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const agents = await db.agent.findMany({ where: { organizationId: auth.organizationId } })
  const active = agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING')
  const totalBudget = agents.reduce((s, a) => s + a.tokenBudget, 0)
  const totalSpend = agents.reduce((s, a) => s + a.tokenSpend, 0)

  return NextResponse.json({
    engine: 'workforce_engine',
    status: 'ACTIVE',
    version: '2.4.1',
    totalAgents: agents.length,
    activeAgents: active.length,
    idleAgents: agents.filter((a) => a.status === 'IDLE').length,
    pausedAgents: agents.filter((a) => a.status === 'PAUSED').length,
    budgetUtilization: totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0,
    spawnPolicy: 'on_demand',
    terminationPolicy: 'idle_timeout_300s',
    capabilities: [
      'spawn_agent',
      'terminate_agent',
      'pause_agent',
      'resume_agent',
      'rebalance_budget',
    ],
  })
}
