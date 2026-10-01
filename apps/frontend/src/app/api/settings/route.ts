export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { encryptSecret } from '@/lib/crypto'

const API_KEY_FIELDS = ['primaryApiKey', 'fallback1ApiKey', 'fallback2ApiKey', 'composioApiKey', 'composioWebhookSecret'] as const

// Organization-owned configuration. Credentials never cross tenant boundaries.
const SYSTEM_FIELDS = new Set([
  'theme', 'accent', 'notifications', 'agentHeartbeats', 'approvalAlerts', 'budgetAlerts',
  'maxTokens', 'intelligence', 'autoApproveLimit', 'escalationPolicy', 'responseEagerness',
  'primaryProvider', 'primaryModel', 'primaryApiKey', 'primaryBaseUrl',
  'fallback1Provider', 'fallback1Model', 'fallback1ApiKey', 'fallback1BaseUrl',
  'fallback2Provider', 'fallback2Model', 'fallback2ApiKey', 'fallback2BaseUrl',
  'composioApiKey', 'composioWebhookSecret',
])

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  let settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
  if (!settings) {
    settings = await db.systemSetting.create({ data: { organizationId: auth.organizationId } })
  }

  const organization = await db.organization.findUnique({ where: { id: auth.organizationId }, select: { name: true } })

  // Never expose API keys in response
  const { primaryApiKey, fallback1ApiKey, fallback2ApiKey, composioApiKey, composioWebhookSecret, ...safeSettings } = settings as any

  return NextResponse.json({
    ...safeSettings,
    organizationName: organization?.name || '',
    hasPrimaryApiKey: Boolean(primaryApiKey),
    hasFallback1ApiKey: Boolean(fallback1ApiKey),
    hasFallback2ApiKey: Boolean(fallback2ApiKey),
    hasComposioApiKey: Boolean(composioApiKey),
    hasComposioWebhookSecret: Boolean(composioWebhookSecret),
  })
}

export async function PATCH(req: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const member = await db.user.findUnique({ where: { id: auth.user.id }, select: { orgRole: true } })
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.orgRole)) return NextResponse.json({ error: 'Organization administrator required' }, { status: 403 })

  try {
    const raw = await req.json()
    const systemBody = Object.fromEntries(
      Object.entries(raw).filter(([k]) => SYSTEM_FIELDS.has(k))
    )
    for (const field of API_KEY_FIELDS) {
      if (typeof systemBody[field] === 'string' && systemBody[field]) {
        systemBody[field] = encryptSecret(systemBody[field] as string)
      } else {
        delete systemBody[field]
      }
    }
    const organizationName = typeof raw.organizationName === 'string' ? raw.organizationName.trim() : undefined

    if (Object.keys(systemBody).length === 0 && organizationName === undefined) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const [settings] = await Promise.all([
      Object.keys(systemBody).length > 0
        ? db.systemSetting.upsert({ where: { organizationId: auth.organizationId }, update: systemBody, create: { organizationId: auth.organizationId, ...systemBody } })
        : db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } }),
      organizationName
        ? db.organization.update({ where: { id: auth.organizationId }, data: { name: organizationName } })
        : null,
    ])

    // Non-blocking — don't fail the save if event logging breaks
    db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'SYSTEM_SETTINGS_UPDATED',
        actorName: 'Founder',
        summary: 'Updated system settings',
        payload: JSON.stringify(Object.keys(raw)),
        severity: 'INFO',
      },
    }).catch(() => {})

    // Never expose API keys in response
    const { primaryApiKey, fallback1ApiKey, fallback2ApiKey, composioApiKey, composioWebhookSecret, ...safeSettings } = (settings || {}) as any

    const org = await db.organization.findUnique({ where: { id: auth.organizationId }, select: { name: true } })
    return NextResponse.json({
      ...safeSettings,
      organizationName: org?.name || '',
      hasPrimaryApiKey: Boolean(primaryApiKey),
      hasFallback1ApiKey: Boolean(fallback1ApiKey),
      hasFallback2ApiKey: Boolean(fallback2ApiKey),
      hasComposioApiKey: Boolean(composioApiKey),
      hasComposioWebhookSecret: Boolean(composioWebhookSecret),
    })
  } catch (e: any) {
    console.error('[Settings PATCH]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
