import { NextRequest, NextResponse } from 'next/server'
import { dequeueBrowseJob, completeBrowseJob, failBrowseJob } from '@/lib/browse-queue'

function checkWorkerAuth(req: NextRequest) {
  const key = req.headers.get('x-worker-key')
  if (key !== process.env.CAMOFOX_WORKER_KEY) {
    return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authError = checkWorkerAuth(req)
  if (authError) return authError

  const job = await dequeueBrowseJob()
  if (!job) {
    return NextResponse.json({ job: null })
  }

  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest) {
  const authError = checkWorkerAuth(req)
  if (authError) return authError

  try {
    const { jobId, status, result, error } = await req.json()

    if (!jobId || !status) {
      return NextResponse.json({ error: 'jobId and status are required' }, { status: 400 })
    }

    if (status === 'COMPLETE') {
      await completeBrowseJob(jobId, result || '')
    } else if (status === 'FAILED') {
      await failBrowseJob(jobId, error || 'Unknown error')
    } else {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
