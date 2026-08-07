export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response

  const { id: agentId, runId } = await params
  const orgId = authResult.organizationId

  try {
    const run = await db.agentRun.findFirst({
      where: { id: runId, agentId, organizationId: orgId },
      include: {
        agent: true,
        steps: { orderBy: { sequence: 'asc' } },
        wakeRequests: true,
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({ run })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch run trace' }, { status: 500 })
  }
}
