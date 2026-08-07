export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response

  const { id: agentId } = await params
  const orgId = authResult.organizationId

  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get('limit')
  const statsParam = searchParams.get('stats')

  try {
    if (statsParam === 'true') {
      const totalRuns = await db.agentRun.count({
        where: { agentId, organizationId: orgId },
      })
      const completedRuns = await db.agentRun.count({
        where: { agentId, organizationId: orgId, status: 'COMPLETED' },
      })
      return NextResponse.json({ totalRuns, completedRuns })
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20
    const runs = await db.agentRun.findMany({
      where: { agentId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        steps: { orderBy: { sequence: 'asc' } },
      },
    })

    return NextResponse.json({ runs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch runs' }, { status: 500 })
  }
}
