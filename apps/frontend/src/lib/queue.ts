/**
 * EKVAAR OS — Distributed Agent Runtime Queue (BullMQ + Redis)
 */

import { Queue, Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Lazy singleton — avoids connection during Next.js SSR/edge compilation
let _connection: IORedis | null = null
function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  }
  return _connection
}

let _queue: Queue | null = null
function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('agent-jobs', { connection: getConnection() })
  }
  return _queue
}

// ── Types ──

export interface AgentJobPayload {
  jobId: string
  organizationId: string
  agentId: string
  agentRole: string
  taskType: string
  mission: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ── Public API ──

export async function enqueueAgentJob(payload: AgentJobPayload): Promise<{ success: boolean; jobId: string }> {
  const job = await getQueue().add(payload.taskType, payload, {
    jobId: payload.jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
  return { success: true, jobId: job.id! }
}

export async function getQueueStats() {
  const q = getQueue()
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ])
  return { waiting, active, completed, failed }
}

// ── Worker (call once from a dedicated process or API route, not at import time) ──

let _worker: Worker | null = null

export function startAgentWorker(
  processor: (job: Job<AgentJobPayload>) => Promise<unknown>,
): Worker {
  if (_worker) return _worker
  _worker = new Worker<AgentJobPayload>('agent-jobs', processor, {
    connection: getConnection(),
    concurrency: 5,
  })
  _worker.on('failed', (job, err) => {
    console.error(`[AgentWorker] Job ${job?.id} failed:`, err.message)
  })
  _worker.on('completed', (job) => {
    console.log(`[AgentWorker] Job ${job.id} completed`)
  })
  return _worker
}
