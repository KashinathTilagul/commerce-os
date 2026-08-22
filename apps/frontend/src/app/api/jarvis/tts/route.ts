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
  const requested = String(body.voice || 'deepgram:flux-naveen-en')
  const apiKey = settings?.speechApiKey ? decryptSecret(settings.speechApiKey) : ''
  if (!apiKey || settings?.speechProvider === 'local') {
    const sidecar = process.env.JARVIS_SIDECAR_URL || process.env.FASTAPI_URL || 'http://localhost:8000'
    const response = await fetch(`${sidecar}/api/jarvis/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'en-IN-PrabhatNeural', speed: Number(body.speed) || 1 }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Local speech fallback is unavailable' }, { status: 503 })
    return new NextResponse(response.body, { headers: { 'Content-Type': response.headers.get('content-type') || 'audio/mpeg', 'Cache-Control': 'no-store' } })
  }

  if (settings?.speechProvider === 'deepgram') {
    const model = requested.startsWith('deepgram:') ? requested.slice(9) : 'flux-naveen-en'
    const speed = Math.min(1.15, Math.max(0.85, Number(body.speed) || 1))
    const response = await fetch(`https://api.deepgram.com/v2/speak?model=${encodeURIComponent(model)}&encoding=mp3&speed=${speed}`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return NextResponse.json({ error: `Deepgram returned ${response.status}` }, { status: 502 })
    return new NextResponse(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  }

  if (settings?.speechProvider !== 'openai') {
    return NextResponse.json({ error: 'Unsupported speech provider' }, { status: 400 })
  }

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
