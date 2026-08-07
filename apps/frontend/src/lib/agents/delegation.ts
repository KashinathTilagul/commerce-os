import { db } from '../db'
import { requestAgentWake } from './wake-coalescer'
import { enqueueAgentJob } from '../queue'

export interface DelegateTaskInput {
  organizationId: string
  managerAgentId: string
  targetAgentId: string
  parentIssueId?: string
  title: string
  description: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
}

/**
 * Executable delegation helper.
 * Enforces hierarchy: manager can only delegate to agents that report to them (or founder override).
 */
export async function delegateToSubordinate(input: DelegateTaskInput): Promise<{
  success: boolean
  issueCode?: string
  message: string
}> {
  const manager = await db.agent.findFirst({
    where: { id: input.managerAgentId, organizationId: input.organizationId },
    include: { reports: true },
  })

  if (!manager) {
    return { success: false, message: 'Manager agent not found' }
  }

  const targetAgent = await db.agent.findFirst({
    where: { id: input.targetAgentId, organizationId: input.organizationId },
  })

  if (!targetAgent) {
    return { success: false, message: 'Target subordinate agent not found' }
  }

  // Hierarchy check: ensure target reports to manager (or manager is Founder / C-Suite)
  const isDirectReport = targetAgent.managerId === manager.id || manager.code === 'FOUNDER' || manager.code === 'CEO'
  if (!isDirectReport) {
    return {
      success: false,
      message: `Agent ${manager.name} does not have delegation authority over ${targetAgent.name}`,
    }
  }

  // Create delegated child issue
  const code = `PAP-${Date.now().toString().slice(-6)}`
  const issue = await db.issue.create({
    data: {
      organizationId: input.organizationId,
      code,
      title: input.title,
      description: input.description,
      priority: input.priority || 'P2',
      status: 'BACKLOG',
      assigneeId: targetAgent.id,
      createdById: manager.id,
      parentIssueId: input.parentIssueId,
      department: targetAgent.department,
    },
  })

  // Log Event
  await db.event.create({
    data: {
      organizationId: input.organizationId,
      type: 'ISSUE_ASSIGNED',
      actorId: manager.id,
      actorName: manager.name,
      summary: `${manager.name} delegated task "${input.title}" (${code}) to ${targetAgent.name}`,
      payload: JSON.stringify({ issueCode: code, targetAgentCode: targetAgent.code }),
    },
  })

  // Trigger wake request for target agent
  const wake = await requestAgentWake({
    organizationId: input.organizationId,
    agentId: targetAgent.id,
    triggerType: 'ASSIGNMENT',
    triggerRef: issue.id,
  })

  if (wake.enqueued && wake.runId) {
    await enqueueAgentJob({
      jobId: wake.runId,
      organizationId: input.organizationId,
      agentId: targetAgent.id,
      agentRole: targetAgent.role,
      taskType: 'HEARTBEAT',
      mission: targetAgent.primeDirective,
      createdAt: new Date().toISOString(),
    })
  }

  return {
    success: true,
    issueCode: code,
    message: `Delegated ${code} to ${targetAgent.name}`,
  }
}
