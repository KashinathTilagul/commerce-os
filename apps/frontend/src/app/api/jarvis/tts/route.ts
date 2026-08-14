export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { sanitizeInput } from '@/lib/security'

export async function POST(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const body = await request.json().catch(() => ({}))
  const text = sanitizeInput(typeof body.text === 'string' ? body.text : '', { maxLength: 4000 })
  if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

  const settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
  const apiKey = settings?.speechApiKey ? decryptSecret(settings.speechApiKey) : ''
  if (!apiKey || settings?.speechProvider !== 'openai') {
    return NextResponse.json({ error: 'Configure an organization speech key in Settings' }, { status: 503 })
  }

  const requested = String(body.voice || 'openai:onyx')
  const voice = requested.startsWith('openai:') ? requested.slice(7) : 'onyx'
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, format: 'mp3', instructions: 'Warm natural Indian male executive assistant. Conversational, measured, never theatrical.' }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) return NextResponse.json({ error: `Speech provider returned ${response.status}` }, { status: 502 })
  return new NextResponse(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
}
