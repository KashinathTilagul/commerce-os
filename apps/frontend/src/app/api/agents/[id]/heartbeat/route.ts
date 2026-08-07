export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { requestAgentWake } from '@/lib/agents/wake-coalescer'
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

    // Atomic wake request check & queue creation
    const wakeResult = await requestAgentWake({
      organizationId: orgId,
      agentId,
      triggerType: 'MANUAL',
    })

    if (wakeResult.coalesced) {
      return NextResponse.json(
        {
          status: 'coalesced',
          message: `Agent ${agent.name} is currently running. Wake request coalesced.`,
          wakeRequestId: wakeResult.wakeRequestId,
        },
        { status: 200 }
      )
    }

    // Enqueue BullMQ job
    if (wakeResult.runId) {
      await enqueueAgentJob({
        jobId: wakeResult.runId,
        organizationId: orgId,
        agentId,
        agentRole: agent.role,
        taskType: 'HEARTBEAT',
        mission: agent.primeDirective,
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      {
        status: 'queued',
        runId: wakeResult.runId,
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
