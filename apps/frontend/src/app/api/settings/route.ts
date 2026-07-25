// @ts-nocheck
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { encryptSecret } from '@/lib/crypto'

const API_KEY_FIELDS = ['primaryApiKey', 'fallback1ApiKey', 'fallback2ApiKey'] as const

// Shared AI engine config (one row for the whole app — API keys, model cascade)
const SYSTEM_FIELDS = new Set([
  'theme', 'accent', 'notifications', 'agentHeartbeats', 'approvalAlerts', 'budgetAlerts',
  'maxTokens', 'intelligence', 'autoApproveLimit', 'escalationPolicy', 'responseEagerness',
  'primaryProvider', 'primaryModel', 'primaryApiKey', 'primaryBaseUrl',
  'fallback1Provider', 'fallback1Model', 'fallback1ApiKey', 'fallback1BaseUrl',
  'fallback2Provider', 'fallback2Model', 'fallback2ApiKey', 'fallback2BaseUrl',
])

// Per-user Krishna voice/prompt preference
const PREFERENCE_FIELDS = new Set(['ttsVoice', 'ttsSpeed', 'ttsStability', 'ttsVolume', 'krishnaPrompt'])

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  let settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
  if (!settings) {
    settings = await db.systemSetting.create({ data: { id: 'global' } })
  }

  let preference = await db.userPreference.findUnique({ where: { userId: auth.user.id } })
  if (!preference) {
    preference = await db.userPreference.create({ data: { userId: auth.user.id } })
  }

  // Never expose API keys in response
  const { primaryApiKey, fallback1ApiKey, fallback2ApiKey, ...safeSettings } = settings as any
  
  return NextResponse.json({ ...safeSettings, ...preference })
}

export async function PATCH(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const raw = await req.json()
    const systemBody = Object.fromEntries(
      Object.entries(raw).filter(([k]) => SYSTEM_FIELDS.has(k))
    )
    for (const field of API_KEY_FIELDS) {
      if (typeof systemBody[field] === 'string' && systemBody[field]) {
        systemBody[field] = encryptSecret(systemBody[field] as string)
      }
    }
    const preferenceBody = Object.fromEntries(
      Object.entries(raw).filter(([k]) => PREFERENCE_FIELDS.has(k))
    )

    if (Object.keys(systemBody).length === 0 && Object.keys(preferenceBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const [settings, preference] = await Promise.all([
      Object.keys(systemBody).length > 0
        ? db.systemSetting.upsert({ where: { id: 'global' }, update: systemBody, create: { id: 'global', ...systemBody } })
        : db.systemSetting.findUnique({ where: { id: 'global' } }),
      Object.keys(preferenceBody).length > 0
        ? db.userPreference.upsert({ where: { userId: auth.user.id }, update: preferenceBody, create: { userId: auth.user.id, ...preferenceBody } })
        : db.userPreference.findUnique({ where: { userId: auth.user.id } }),
    ])

    // Non-blocking — don't fail the save if event logging breaks
    db.event.create({
      data: {
        userId: auth.user.id,
        type: 'SYSTEM_SETTINGS_UPDATED',
        actorName: 'Founder',
        summary: 'Updated system settings',
        payload: JSON.stringify(Object.keys(raw)),
        severity: 'INFO',
      },
    }).catch(() => {})

    // Never expose API keys in response
    const { primaryApiKey, fallback1ApiKey, fallback2ApiKey, ...safeSettings } = (settings || {}) as any
    
    return NextResponse.json({ ...safeSettings, ...preference })
  } catch (e: any) {
    console.error('[Settings PATCH]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
