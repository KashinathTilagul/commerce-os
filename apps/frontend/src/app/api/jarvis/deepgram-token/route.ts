export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
  if (settings?.speechProvider !== 'deepgram' || !settings.speechApiKey) {
    return NextResponse.json({ error: 'Configure Deepgram in Settings first' }, { status: 503 })
  }

  const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
    method: 'POST',
    headers: { Authorization: `Token ${decryptSecret(settings.speechApiKey)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl_seconds: 60 }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) {
    console.error('[Deepgram token]', response.status, await response.text())
    return NextResponse.json({ error: 'Deepgram authentication failed' }, { status: 502 })
  }

  const token = await response.json()
  return NextResponse.json(
    { accessToken: token.access_token, expiresIn: token.expires_in },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
