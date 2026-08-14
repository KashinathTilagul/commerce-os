export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'

async function probe(name: string, url: string | undefined) {
  if (!url) return { name, configured: false, healthy: false }
  const started = Date.now()
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4_000) })
    return { name, configured: true, healthy: response.ok, status: response.status, latencyMs: Date.now() - started }
  } catch (error: any) {
    return { name, configured: true, healthy: false, latencyMs: Date.now() - started, error: error.message }
  }
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const omniroute = process.env.OMNIROUTE_BASE_URL?.replace(/\/v1\/?$/, '')
  const cognee = process.env.COGNEE_API_URL?.replace(/\/$/, '')
  const n8n = process.env.N8N_INTERNAL_URL?.replace(/\/$/, '')
  const dograh = process.env.DOGRAH_API_URL?.replace(/\/$/, '')
  const openDesign = process.env.OPEN_DESIGN_URL?.replace(/\/$/, '')
  const upskill = process.env.UPSKILL_API_URL?.replace(/\/$/, '')
  const googleWorkspace = process.env.GOOGLE_WORKSPACE_API_URL?.replace(/\/$/, '')
  const services = await Promise.all([
    probe('OmniRoute', omniroute ? `${omniroute}/v1/models` : undefined),
    probe('Cognee Memory', cognee ? `${cognee}/health` : undefined),
    probe('n8n Workflow', n8n ? `${n8n}/healthz` : undefined),
    probe('Dograh Voice', dograh ? `${dograh}/api/v1/health` : undefined),
    probe('Open Design', openDesign ? `${openDesign}/api/health` : undefined),
    probe('UPskill', upskill ? `${upskill}/health` : undefined),
    probe('Google Workspace CLI', googleWorkspace ? `${googleWorkspace}/health` : undefined),
  ])
  return NextResponse.json({ services, checkedAt: new Date().toISOString() })
}
