import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  let settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
  
  if (!settings) {
    settings = await db.systemSetting.create({
      data: { id: 'global' },
    })
  }
  
  return NextResponse.json(settings)
}

// Only fields the current Prisma client knows about — prevents validation errors
// when the schema has been updated but the client hasn't been regenerated yet.
const SAFE_FIELDS = new Set([
  'theme', 'accent', 'notifications', 'agentHeartbeats', 'approvalAlerts', 'budgetAlerts',
  'maxTokens', 'intelligence', 'autoApproveLimit', 'escalationPolicy',
  'ttsVoice', 'krishnaPrompt',
  'primaryProvider', 'primaryModel', 'primaryApiKey', 'primaryBaseUrl',
  'fallback1Provider', 'fallback1Model', 'fallback1ApiKey', 'fallback1BaseUrl',
  'fallback2Provider', 'fallback2Model', 'fallback2ApiKey', 'fallback2BaseUrl',
  // New voice params — included once prisma generate has been run
  'ttsSpeed', 'ttsStability', 'ttsVolume', 'responseEagerness',
])

export async function PATCH(req: Request) {
  try {
    const raw = await req.json()
    // Strip unknown fields so Prisma never sees them (avoids PrismaClientValidationError
    // when schema was pushed with --skip-generate and client is stale)
    const body = Object.fromEntries(
      Object.entries(raw).filter(([k]) => SAFE_FIELDS.has(k))
    )

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const updated = await db.systemSetting.upsert({
      where: { id: 'global' },
      update: body,
      create: { id: 'global', ...body },
    })

    // Non-blocking — don't fail the save if event logging breaks
    db.event.create({
      data: {
        type: 'SYSTEM_SETTINGS_UPDATED',
        actorName: 'Founder',
        summary: 'Updated system settings',
        payload: JSON.stringify(Object.keys(body)),
        severity: 'INFO',
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('[Settings PATCH]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
