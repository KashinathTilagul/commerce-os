export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { fetchOmniRouteModels, getOmniRouteConfig, normalizeOmniRouteBaseUrl, saveOmniRouteConfig } from '@/lib/omniroute-config'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { baseUrl, apiKey, imageModel } = body

    if (!baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 })
    }

    const normalizedBaseUrl = normalizeOmniRouteBaseUrl(baseUrl)
    const existing = await getOmniRouteConfig(auth.organizationId)
    const response = await fetchOmniRouteModels(normalizedBaseUrl, apiKey?.trim() || existing.apiKey)
    if (!response.ok) {
      return NextResponse.json({ error: `OmniRoute returned ${response.status}` }, { status: 502 })
    }
    await saveOmniRouteConfig(auth.organizationId, { baseUrl: normalizedBaseUrl, apiKey, imageModel })

    return NextResponse.json({ success: true, baseUrl: normalizedBaseUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
