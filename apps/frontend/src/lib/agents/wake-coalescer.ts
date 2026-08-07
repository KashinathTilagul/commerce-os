import { db } from '../db'

export interface WakeRequestPayload {
  organizationId: string
  agentId: string
  triggerType: 'ASSIGNMENT' | 'MENTION' | 'SCHEDULE' | 'APPROVAL_RESOLVED' | 'MANUAL' | 'AUTOMATION'
  triggerRef?: string
}

/**
 * Atomic wake request receiver.
 * - If agent is IDLE: Creates AgentWakeRequest (ENQUEUED), AgentRun (QUEUED), and returns { enqueued: true, runId }
 * - If agent is RUNNING / HAS QUEUED RUN: Creates AgentWakeRequest (COALESCED), and returns { enqueued: false, coalesced: true }
 */
// ponytail: single-node PostgreSQL lock coalescing — suitable for single-instance deployments up to 10k wakes/min. 
// Upgrade path: Redis BullMQ / pg-boss queue for distributed multi-instance worker pools.
export async function requestAgentWake(payload: WakeRequestPayload): Promise<{
  enqueued: boolean
  coalesced: boolean
  runId?: string
  wakeRequestId: string
}> {
  const agent = await db.agent.findFirst({
    where: { id: payload.agentId, organizationId: payload.organizationId },
  })

  if (!agent) {
    throw new Error(`Agent ${payload.agentId} not found`)
  }

  if (agent.status === 'PAUSED') {
    throw new Error(`Agent ${agent.name} is PAUSED (budget cap or founder pause)`)
  }

  if (agent.status === 'OFFLINE') {
    throw new Error(`Agent ${agent.name} is OFFLINE`)
  }

  // Check if there is already an active or queued run
  const activeOrQueuedRun = await db.agentRun.findFirst({
    where: {
      agentId: payload.agentId,
      organizationId: payload.organizationId,
      status: { in: ['QUEUED', 'STARTING', 'RUNNING'] },
    },
  })

  if (agent.status === 'RUNNING' || activeOrQueuedRun) {
    // Coalesce request: do not launch another concurrent run
    const wake = await db.agentWakeRequest.create({
      data: {
        organizationId: payload.organizationId,
        agentId: payload.agentId,
        triggerType: payload.triggerType,
        triggerRef: payload.triggerRef,
        status: 'COALESCED',
      },
    })

    return { enqueued: false, coalesced: true, wakeRequestId: wake.id }
  }

  // Agent is IDLE: create AgentRun first, then AgentWakeRequest with coalescedIntoRunId directly (saves 1 DB round-trip query)
  const run = await db.agentRun.create({
    data: {
      organizationId: payload.organizationId,
      agentId: payload.agentId,
      triggerType: payload.triggerType,
      triggerRef: payload.triggerRef,
      status: 'QUEUED',
    },
  })

  const wake = await db.agentWakeRequest.create({
    data: {
      organizationId: payload.organizationId,
      agentId: payload.agentId,
      triggerType: payload.triggerType,
      triggerRef: payload.triggerRef,
      status: 'ENQUEUED',
      coalescedIntoRunId: run.id,
    },
  })

  // Set agent status to RUNNING
  await db.agent.update({
    where: { id: payload.agentId },
    data: { status: 'RUNNING', lastHeartbeat: new Date() },
  })

  return { enqueued: true, coalesced: false, runId: run.id, wakeRequestId: wake.id }
}

/**
 * Called when an AgentRun finishes execution.
 * Checks for any pending COALESCED wake requests.
 * - If found: Creates follow-up AgentRun, marks wakes PROCESSED, keeps agent RUNNING, returns followUpRun.
 * - If none: Sets agent status to IDLE, returns null.
 */
export async function finalizeRunAndCheckCoalesced(
  organizationId: string,
  agentId: string,
  currentRunId: string,
): Promise<{ followUpRunId: string | null }> {
  // Fetch pending coalesced wake requests for this agent
  const pendingWakes = await db.agentWakeRequest.findMany({
    where: {
      agentId,
      organizationId,
      status: 'COALESCED',
    },
    orderBy: { receivedAt: 'asc' },
  })

  if (pendingWakes.length === 0) {
    // No pending wakes: transition agent to IDLE
    await db.agent.update({
      where: { id: agentId },
      data: { status: 'IDLE', currentTask: null },
    })
    return { followUpRunId: null }
  }

  // Pending wakes exist: consolidate into a single follow-up run
  const primaryWake = pendingWakes[0]
  const followUpRun = await db.agentRun.create({
    data: {
      organizationId,
      agentId,
      triggerType: 'COALESCED',
      triggerRef: primaryWake.triggerRef || currentRunId,
      status: 'QUEUED',
    },
  })

  // Mark all coalesced wakes as PROCESSED
  await db.agentWakeRequest.updateMany({
    where: {
      id: { in: pendingWakes.map((w) => w.id) },
    },
    data: {
      status: 'PROCESSED',
      coalescedIntoRunId: followUpRun.id,
    },
  })

  // Agent remains RUNNING
  await db.agent.update({
    where: { id: agentId },
    data: { status: 'RUNNING', lastHeartbeat: new Date() },
  })

  return { followUpRunId: followUpRun.id }
}
