export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { enqueueAgentJob } from '@/lib/queue'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response

  const { id: agentId } = await params
  const orgId = authResult.organizationId

  try {
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: orgId },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.isHuman) {
      return NextResponse.json({ error: 'Human team member cannot be pulsed' }, { status: 400 })
    }

    if (agent.status === 'PAUSED') {
      return NextResponse.json(
        { error: `Agent ${agent.name} is PAUSED due to budget or policy limit` },
        { status: 402 }
      )
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await enqueueAgentJob({
      jobId: runId,
      organizationId: orgId,
      agentId,
      agentRole: agent.role,
      taskType: 'HEARTBEAT',
      mission: agent.primeDirective,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        status: 'queued',
        runId,
        message: `Heartbeat queued for ${agent.name}`,
      },
      { status: 202 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to queue heartbeat' },
      { status: 500 }
    )
  }
}
