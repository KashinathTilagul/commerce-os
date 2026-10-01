export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { fetchOmniRouteModels, getOmniRouteConfig, normalizeOmniRouteBaseUrl, saveOmniRouteConfig } from '@/lib/omniroute-config'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const member = await db.user.findUnique({ where: { id: auth.user.id }, select: { orgRole: true } })
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.orgRole)) return NextResponse.json({ error: 'Organization administrator required' }, { status: 403 })

  try {
    const body = await req.json()
    const { baseUrl, apiKey, imageModel } = body

    if (!baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 })
    }

    const normalizedBaseUrl = normalizeOmniRouteBaseUrl(baseUrl)
    const existing = await getOmniRouteConfig(auth.organizationId)
    if (!apiKey?.trim() && normalizedBaseUrl !== existing.baseUrl) {
      return NextResponse.json({ error: 'Provide a new API key when changing the gateway URL' }, { status: 400 })
    }
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
