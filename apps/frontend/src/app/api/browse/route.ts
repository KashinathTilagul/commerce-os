import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { enqueueBrowseJob, getJobStatus } from '@/lib/browse-queue'
import { createApiError } from '@/lib/security'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return createApiError('Job ID is required', 400)
  }

  const job = await getJobStatus(auth.organizationId, id)
  if (!job) {
    return createApiError('Job not found', 404)
  }

  return NextResponse.json({ success: true, data: job })
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { agentCode, url, action, actionData, priority } = body

    if (!agentCode || !url) {
      return createApiError('agentCode and url are required', 400)
    }

    const jobId = await enqueueBrowseJob(auth.organizationId, {
      agentCode,
      url,
      action,
      actionData,
      priority
    })

    return NextResponse.json({ success: true, jobId })
  } catch (error: any) {
    return createApiError(error.message || 'Failed to enqueue job', 500)
  }
}
