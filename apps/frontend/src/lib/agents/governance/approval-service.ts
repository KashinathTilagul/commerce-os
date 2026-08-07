import { db } from '../../db'
import { requestAgentWake } from '../wake-coalescer'
import { enqueueAgentJob } from '../../queue'

export interface CreateApprovalInput {
  organizationId: string
  requesterId: string
  type: 'BUDGET' | 'STRATEGIC' | 'HIRING' | 'CAMPAIGN' | 'VENDOR'
  title: string
  description: string
  amount?: number
  issueCode?: string
}

export async function createGovernanceApproval(input: CreateApprovalInput) {
  const code = `APR-${Date.now().toString().slice(-6)}`

  const approval = await db.approval.create({
    data: {
      organizationId: input.organizationId,
      code,
      type: input.type,
      title: input.title,
      description: input.description,
      amount: input.amount || 0,
      status: 'PENDING',
      requesterId: input.requesterId,
      issueCode: input.issueCode,
    },
    include: { requester: true },
  })

  // Create Event log
  await db.event.create({
    data: {
      organizationId: input.organizationId,
      type: 'APPROVAL_REQUESTED',
      actorId: input.requesterId,
      actorName: approval.requester.name,
      summary: `${approval.requester.name} requested approval (${code}): ${input.title}`,
      payload: JSON.stringify({ approvalCode: code, type: input.type, amount: input.amount }),
      severity: 'WARN',
    },
  })

  return approval
}

export async function resolveGovernanceApproval(
  organizationId: string,
  approvalId: string,
  resolution: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
) {
  const approval = await db.approval.findFirst({
    where: { id: approvalId, organizationId },
    include: { requester: true },
  })

  if (!approval) throw new Error('Approval request not found')

  const updated = await db.approval.update({
    where: { id: approvalId },
    data: {
      status: resolution,
      resolvedAt: new Date(),
    },
  })

  // Log Event
  await db.event.create({
    data: {
      organizationId,
      type: `APPROVAL_${resolution}`,
      actorName: 'Founder',
      summary: `Founder ${resolution.toLowerCase()} approval ${approval.code}: ${approval.title}`,
      payload: JSON.stringify({ approvalCode: approval.code, resolution }),
    },
  })

  // If APPROVED, trigger wake request to resume agent execution!
  if (resolution === 'APPROVED' && approval.requesterId) {
    const wake = await requestAgentWake({
      organizationId,
      agentId: approval.requesterId,
      triggerType: 'APPROVAL_RESOLVED',
      triggerRef: approval.id,
    })

    if (wake.enqueued && wake.runId) {
      await enqueueAgentJob({
        jobId: wake.runId,
        organizationId,
        agentId: approval.requesterId,
        agentRole: approval.requester.role,
        taskType: 'HEARTBEAT',
        mission: approval.requester.primeDirective,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return updated
}
