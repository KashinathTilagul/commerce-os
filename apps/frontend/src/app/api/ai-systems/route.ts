import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization, requireAuth } from '@/lib/auth-guard'

const PILLAR_DEPARTMENT_MAP: Record<string, string[]> = {
  brand: ['CREATIVE', 'BRAND', 'EXECUTIVE'],
  content: ['MARKETING'],
  creative: ['CREATIVE'],
  commerce: ['EXECUTIVE', 'GROWTH', 'FINANCE'],
  founder: ['EXECUTIVE'],
  product: ['TECHNOLOGY', 'PRODUCT'],
  operations: ['OPERATIONS'],
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const userId = auth.user.id // Kept for legacy usage if any, but queries use orgId

  const [systems, agents] = await Promise.all([
    db.aISystem.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { name: 'asc' },
    }),
    db.agent.findMany({
      where: { organizationId: auth.organizationId },
    }),
  ])

  const enrichedSystems = systems.map((sys) => {
    const targetDeps = PILLAR_DEPARTMENT_MAP[sys.pillar] || []
    const matchingAgents = agents.filter(
      (a) => targetDeps.includes(a.department.toUpperCase()) || (sys.pillar === 'brand' && a.code === 'CCO')
    )

    const agentPool = matchingAgents.length > 0 ? matchingAgents : agents

    const tasksToday = agentPool.reduce((sum, a) => sum + (a.tasksToday || 0), 0)
    const tasksTotal = agentPool.reduce((sum, a) => sum + (a.tasksTotal || 0), 0)
    
    // Derive health (0-100) from mean agent successRate or active status
    const activeAgentCount = agentPool.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length
    const avgSuccess = agentPool.reduce((sum, a) => sum + (a.successRate || 0.95), 0) / (agentPool.length || 1)
    
    const derivedHealth = Math.round(
      Math.min(100, Math.max(70, avgSuccess * 100 + (activeAgentCount > 0 ? 5 : 0)))
    )

    const derivedAccuracy = Math.round(avgSuccess * 100)

    // Find latest heartbeat/update date
    const dates = agentPool
      .map((a) => a.lastHeartbeat)
      .filter(Boolean) as Date[]
    const lastRun = dates.length > 0 ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))) : (sys.lastRun || new Date())

    return {
      ...sys,
      health: derivedHealth,
      tasksToday,
      tasksTotal,
      accuracy: derivedAccuracy,
      lastRun,
    }
  })

  return NextResponse.json(enrichedSystems)
}
