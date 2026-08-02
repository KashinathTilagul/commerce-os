import { NextRequest, NextResponse } from 'next/server'
import { dequeueBrowseJob, completeBrowseJob, failBrowseJob } from '@/lib/browse-queue'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

const BROWSER_SIDECAR_URL = process.env.BROWSER_SIDECAR_URL || process.env.JARVIS_SIDECAR_URL || 'http://localhost:8000'

function checkWorkerAuth(req: NextRequest) {
  const key = req.headers.get('x-worker-key')
  if (key !== (process.env.BROWSER_WORKER_KEY || process.env.CAMOFOX_WORKER_KEY)) {
    return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 })
  }
  return null
}

function dec(value?: string | null) {
  try {
    return decryptSecret(value)
  } catch {
    return ''
  }
}

async function browserAiSettings() {
  const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
  if (!settings) return {}

  const slots = [
    {
      provider: settings.primaryProvider,
      model: settings.primaryModel,
      apiKey: dec(settings.primaryApiKey),
      baseUrl: settings.primaryBaseUrl,
    },
    {
      provider: settings.fallback1Provider,
      model: settings.fallback1Model,
      apiKey: dec(settings.fallback1ApiKey),
      baseUrl: settings.fallback1BaseUrl,
    },
    {
      provider: settings.fallback2Provider,
      model: settings.fallback2Model,
      apiKey: dec(settings.fallback2ApiKey),
      baseUrl: settings.fallback2BaseUrl,
    },
  ]

  const selected = slots.find((slot) => slot.provider && slot.model && slot.apiKey)
  if (!selected) return {}
  return {
    ai_provider: selected.provider,
    ai_model: selected.model,
    ai_api_key: selected.apiKey,
    ai_base_url: selected.baseUrl,
  }
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

export async function POST(req: NextRequest) {
  const authError = checkWorkerAuth(req)
  if (authError) return authError

  const job = await dequeueBrowseJob()
  if (!job) return NextResponse.json({ job: null })

  try {
    const actionData = job.actionData ? JSON.parse(job.actionData) : {}
    const task = actionData.task || actionData.prompt || job.action || 'Take a snapshot and summarize the page.'
    const aiSettings = await browserAiSettings()
    const response = await fetch(`${BROWSER_SIDECAR_URL}/api/browser/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        url: job.url,
        agent_code: job.agentCode,
        device: actionData.device || 'desktop',
        browser_channel: actionData.browserChannel,
        viewport_width: actionData.viewportWidth,
        viewport_height: actionData.viewportHeight,
        user_agent: actionData.userAgent,
        user_data_dir: actionData.userDataDir,
        ...aiSettings,
      }),
      signal: AbortSignal.timeout(120000),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.detail || payload.error || `Browser sidecar failed with ${response.status}`)
    }

    await completeBrowseJob(job.id, JSON.stringify(payload))
    return NextResponse.json({ success: true, jobId: job.id, result: payload })
  } catch (err: any) {
    await failBrowseJob(job.id, err.message || 'Browser worker failed')
    return NextResponse.json({ success: false, jobId: job.id, error: err.message }, { status: 500 })
  }
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
