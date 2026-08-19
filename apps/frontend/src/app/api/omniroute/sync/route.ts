export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    const baseUrl = settings?.primaryBaseUrl || process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1'
    const apiKey = settings?.primaryApiKey || process.env.OMNIROUTE_API_KEY || ''

    // Fetch models from OmniRoute
    const modelsRes = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10000),
    })

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