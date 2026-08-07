import { db } from '../db'
import { Prisma } from '@prisma/client'

export interface StepRecordInput {
  sequence: number
  type: 'CONTEXT_LOAD' | 'PLAN' | 'TOOL_CALL' | 'DELEGATE' | 'COMMENT' | 'STATUS_UPDATE' | 'ARTIFACT' | 'ERROR'
  toolName?: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
  inputSummary?: string
  outputSummary?: string
  error?: string
}

export async function createRunRecord(data: {
  id: string
  organizationId: string
  agentId: string
  triggerType: string
  triggerRef?: string
  model?: string
  provider?: string
  executionPlan?: string
}): Promise<void> {
  await db.agentRun.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      organizationId: data.organizationId,
      agentId: data.agentId,
      triggerType: data.triggerType,
      triggerRef: data.triggerRef,
      model: data.model,
      provider: data.provider,
      executionPlan: data.executionPlan,
      status: 'STARTING',
      startedAt: new Date(),
    },
    update: {
      status: 'STARTING',
      startedAt: new Date(),
      executionPlan: data.executionPlan,
    },
  })
}

export async function recordRunStep(runId: string, step: StepRecordInput): Promise<void> {
  await db.agentRunStep.create({
    data: {
      runId,
      sequence: step.sequence,
      type: step.type,
      toolName: step.toolName,
      status: step.status,
      startedAt: new Date(),
      completedAt: step.status !== 'RUNNING' ? new Date() : null,
      inputSummary: step.inputSummary,
      outputSummary: step.outputSummary,
      error: step.error,
    },
  })
}

export async function completeRunRecord(data: {
  runId: string
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
  durationMs: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  outputSummary?: string
  error?: string
}): Promise<void> {
  await db.agentRun.update({
    where: { id: data.runId },
    data: {
      status: data.status,
      completedAt: new Date(),
      durationMs: data.durationMs,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      estimatedCost: new Prisma.Decimal(data.estimatedCost),
      outputSummary: data.outputSummary,
      error: data.error,
    },
  })
}
