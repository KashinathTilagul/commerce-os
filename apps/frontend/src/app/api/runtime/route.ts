export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// Agent Runtime — core lifecycle manager (Planning → Waiting Approval → Executing)
export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const agents = await db.agent.findMany({ where: { organizationId: auth.organizationId } })

  const lifecycles = agents.filter((a) => !a.isHuman).map((a) => ({
    agent: a.code,
    name: a.name,
    phase: a.status === 'RUNNING' ? 'EXECUTING' : a.status === 'ACTIVE' ? 'PLANNING' : 'IDLE',
    currentTask: a.currentTask,
    lastHeartbeat: a.lastHeartbeat,
  }))

  return NextResponse.json({
    engine: 'agent_runtime',
    status: 'ACTIVE',
    version: '1.8.2',
    phases: ['PLANNING', 'WAITING_APPROVAL', 'EXECUTING', 'SLEEPING'],
    activeLifecycles: lifecycles,
    heartbeatInterval: 30000,
    contextWindowStrategy: 'dynamic_injection',
  })
}
