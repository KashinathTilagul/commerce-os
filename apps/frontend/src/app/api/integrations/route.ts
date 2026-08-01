import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listToolkits, getToolsForToolkit } from '@/lib/composio-service'
import { requireOrganization } from '@/lib/auth-guard'

// GET /api/integrations — list all integrations with connection status
export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Reconcile on every catalog read so newly added apps appear for existing organizations too.
  const { seedIntegrations } = await import('@/lib/composio-service')
  await seedIntegrations(auth.organizationId)

  const integrations = await db.integration.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      _count: { select: { executions: true } },
    },
    orderBy: { category: 'asc' },
  })

  // Group by category
  const grouped: Record<string, any[]> = {}
  for (const i of integrations) {
    if (!grouped[i.category]) grouped[i.category] = []
    grouped[i.category].push({
      ...i,
      tools: getToolsForToolkit(i.toolkitSlug),
      executionsCount: i._count.executions,
    })
  }

  const connectedCount = integrations.filter((i) => i.isConnected).length
  const totalExecutions = integrations.reduce((s, i) => s + i._count.executions, 0)

  return NextResponse.json({
    grouped,
    stats: {
      total: integrations.length,
      connected: connectedCount,
      totalExecutions,
      totalTools: integrations.reduce((s, i) => s + i.toolsCount, 0),
    },
  })
}
