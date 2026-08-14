import { db } from '@/lib/db'

export async function enqueueBrowseJob(organizationId: string, data: { agentCode: string, url: string, action?: string, actionData?: string, priority?: number }) {
  const job = await db.browseJob.create({
    data: {
      organizationId,
      agentCode: data.agentCode,
      url: data.url,
      action: data.action ?? 'snapshot',
      actionData: data.actionData,
      priority: data.priority ?? 5,
      status: 'PENDING'
    }
  })
  return job.id
}

export async function dequeueBrowseJob() {
  const job = await db.browseJob.findFirst({
    where: { status: 'PENDING' },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' }
    ]
  })

  if (!job) return null

  return db.browseJob.update({
    where: { id: job.id },
    data: {
      status: 'RUNNING',
      startedAt: new Date()
    }
  })
}

export async function completeBrowseJob(jobId: string, result: string) {
  return db.browseJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETE',
      result,
      completedAt: new Date()
    }
  })
}

export async function failBrowseJob(jobId: string, error: string) {
  const job = await db.browseJob.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Job not found')

  const retries = job.retries + 1
  const isFailed = retries >= job.maxRetries

  return db.browseJob.update({
    where: { id: jobId },
    data: {
      status: isFailed ? 'FAILED' : 'PENDING',
      error,
      retries,
      startedAt: isFailed ? job.startedAt : null
    }
  })
}

export async function getJobStatus(organizationId: string, jobId: string) {
  return db.browseJob.findUnique({
    where: { id: jobId, organizationId }
  })
}

export async function timeoutStalledJobs() {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
  return db.browseJob.updateMany({
    where: {
      status: 'RUNNING',
      startedAt: { lte: fiveMinsAgo }
    },
    data: {
      status: 'TIMEOUT'
    }
  })
}
