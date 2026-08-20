export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    const baseUrl = settings?.primaryBaseUrl || process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1'
    const apiKey = settings?.primaryApiKey ? await db.systemSetting.findUnique({ where: { id: 'global' } }).then(s => s?.primaryApiKey) : null
    
    // Try to get status from OmniRoute
    let connected = false
    let providers: any[] = []
    let usage: any = {}
    
    try {
      const omnirouteUrl = baseUrl.replace(/\/v1\/?$/, '')
      const [statusRes, modelsRes] = await Promise.all([
        fetch(`${omnirouteUrl}/health`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${baseUrl}/models`, { 
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: AbortSignal.timeout(4000) 
        }).catch(() => null),
      ])
      
      connected = statusRes.ok
      
      if (modelsRes?.ok) {
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
      providers: providers.length > 0 ? providers : [
        { id: 'anthropic', name: 'Anthropic', connected: false, status: 'not_configured' },
        { id: 'openai', name: 'OpenAI', connected: false, status: 'not_configured' },
        { id: 'google', name: 'Google AI', connected: false, status: 'not_configured' },
      ],
      usage,
    })
  } catch (error: any) {
    return NextResponse.json({ connected: false, providers: [], error: error.message })
  }
}