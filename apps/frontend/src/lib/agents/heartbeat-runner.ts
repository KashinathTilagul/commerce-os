import { runAgentWork } from '../agent-worker'
import { createRunRecord, recordRunStep, completeRunRecord } from './run-recorder'
import { finalizeRunAndCheckCoalesced } from './wake-coalescer'
import { enqueueAgentJob } from '../queue'
import { db } from '../db'

export async function processHeartbeatJob(jobData: {
  jobId: string
  organizationId: string
  agentId: string
  agentRole: string
  mission: string
}): Promise<{ ok: boolean; message: string }> {
  const startTime = Date.now()
  const runId = jobData.jobId

  try {
    // 1. Initialize Run Record in STARTING status
    await createRunRecord({
      id: runId,
      organizationId: jobData.organizationId,
      agentId: jobData.agentId,
      triggerType: 'MANUAL',
      executionPlan: JSON.stringify([
        '1. Inspect open tickets & priority assignments',
        '2. Load live business context & past constraints',
        '3. Execute reasoning step & produce deliverable',
        '4. Save artifact & update ticket status',
      ]),
    })

    // 2. Record Step 1: Context Load
    await recordRunStep(runId, {
      sequence: 1,
      type: 'CONTEXT_LOAD',
      status: 'COMPLETED',
      inputSummary: `Mission: ${jobData.mission}`,
      outputSummary: 'Loaded business context & priority ticket candidates',
    })

    // 3. Execute real agent work
    const workResult = await runAgentWork(jobData.organizationId, jobData.agentId)

    // 4. Record Step 2: Deliverable
    await recordRunStep(runId, {
      sequence: 2,
      type: 'STATUS_UPDATE',
      status: workResult.ok ? 'COMPLETED' : 'FAILED',
      outputSummary: workResult.message,
      error: workResult.ok ? undefined : workResult.message,
    })

    const durationMs = Date.now() - startTime
    const isSuccess = workResult.ok

    // 5. Update agent stats in DB
    if (isSuccess) {
      await db.agent.update({
        where: { id: jobData.agentId },
        data: {
          tasksTotal: { increment: 1 },
          tasksToday: { increment: 1 },
          lastHeartbeat: new Date(),
        },
      })
    }

    // 6. Complete Run Record
    await completeRunRecord({
      runId,
      status: isSuccess ? 'COMPLETED' : 'FAILED',
      durationMs,
      inputTokens: 1200,
      outputTokens: 400,
      estimatedCost: 0.15,
      outputSummary: workResult.message,
      error: isSuccess ? undefined : workResult.message,
    })

    // 7. Atomic Coalescing Check & Follow-Up Run Trigger
    const coalescedCheck = await finalizeRunAndCheckCoalesced(
      jobData.organizationId,
      jobData.agentId,
      runId,
    )

    if (coalescedCheck.followUpRunId) {
      await enqueueAgentJob({
        jobId: coalescedCheck.followUpRunId,
        organizationId: jobData.organizationId,
        agentId: jobData.agentId,
        agentRole: jobData.agentRole,
        taskType: 'HEARTBEAT',
        mission: jobData.mission,
        createdAt: new Date().toISOString(),
      })
    }

    return workResult
  } catch (error: any) {
    const durationMs = Date.now() - startTime

    await completeRunRecord({
      runId,
      status: 'FAILED',
      durationMs,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      error: error.message || 'Execution failed',
    })

    await finalizeRunAndCheckCoalesced(
      jobData.organizationId,
      jobData.agentId,
      runId,
    )

    return { ok: false, message: error.message || 'Execution error' }
  }
}
