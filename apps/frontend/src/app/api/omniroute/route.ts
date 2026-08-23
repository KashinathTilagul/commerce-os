export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { fetchOmniRouteModels, getOmniRouteConfig } from '@/lib/omniroute-config'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { baseUrl, apiKey, hasApiKey } = await getOmniRouteConfig(auth.organizationId)
    let connected = false
    let providers: any[] = []

    try {
      const modelsRes = await fetchOmniRouteModels(baseUrl, apiKey)
      connected = modelsRes.ok
      if (connected) {
        const modelsData = await modelsRes.json()
        providers = (modelsData.data || []).slice(0, 20).map((m: any) => ({
          id: m.id,
          name: m.id,
          connected: true,
          status: 'active',
        }))
      }
    } catch {}

    return NextResponse.json({
      connected,
      baseUrl,
      hasApiKey,
      providers,
    })
  } catch (error: any) {
    return NextResponse.json({ connected: false, providers: [], error: error.message })
  }
}
