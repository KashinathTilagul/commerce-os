export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { fetchOmniRouteModels, getOmniRouteConfig } from '@/lib/omniroute-config'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { baseUrl, apiKey } = await getOmniRouteConfig(auth.organizationId)
    const modelsRes = await fetchOmniRouteModels(baseUrl, apiKey, 10_000)

    if (!modelsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch models from OmniRoute' }, { status: 502 })
    }

    const modelsData = await modelsRes.json()
    const providers = new Map<string, { name: string; connected: boolean; models: number }>()

    for (const model of modelsData.data || []) {
      const provider = model.id.split('/')[0] || 'unknown'
      if (!providers.has(provider)) {
        providers.set(provider, { name: provider, connected: true, models: 0 })
      }
      providers.get(provider)!.models++
    }

    return NextResponse.json({
      success: true,
      providers: Array.from(providers.values()),
      totalModels: modelsData.data?.length || 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
