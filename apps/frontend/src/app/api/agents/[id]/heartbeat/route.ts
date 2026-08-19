export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { runAgentWork } from '@/lib/agent-worker'
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

    // Run the agent's work directly. The BullMQ "agent-jobs" queue has no
    // worker, so enqueueing there was a fake success — call the real work
    // function and return its actual result.
    const result = await runAgentWork(orgId, agentId)

    return NextResponse.json(
      {
        ok: result.ok,
        message: result.message,
        issueCode: result.issueCode,
        newStatus: result.newStatus,
        milestone: result.milestone,
      },
      { status: result.ok ? 200 : 500 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to run heartbeat' },
      { status: 500 }
    )
  }
}
