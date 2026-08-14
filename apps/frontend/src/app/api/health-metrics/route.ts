export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const integrations = await db.integration.findMany({
    where: { organizationId: auth.organizationId },
    select: { name: true, isConnected: true, toolsCount: true, executionsCount: true, connectedAt: true },
    orderBy: { executionsCount: 'desc' },
  })

  const activeAgents = await db.agent.count({
    where: { organizationId: auth.organizationId, isHuman: false, status: { in: ['ACTIVE', 'RUNNING'] } },
  })
  const totalWorkflows = await db.event.count({ where: { organizationId: auth.organizationId } })

  const mem = process.memoryUsage()

  return NextResponse.json({
    uptimeSeconds: Math.floor(process.uptime()),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    activeAgents,
    totalWorkflows,
    connectedIntegrations: integrations.filter(i => i.isConnected).length,
    integrations,
  })
}
