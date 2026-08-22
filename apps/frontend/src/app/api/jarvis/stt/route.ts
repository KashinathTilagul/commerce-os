export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob | null

    if (!audioFile) {
      return NextResponse.json({ transcript: '' })
    }

    const settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
    const speechKey = settings?.speechApiKey ? decryptSecret(settings.speechApiKey) : ''
    if (settings?.speechProvider === 'deepgram' && speechKey) {
      const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&detect_language=true', {
        method: 'POST',
        headers: { Authorization: `Token ${speechKey}`, 'Content-Type': audioFile.type || 'audio/webm' },
        body: audioFile,
        signal: AbortSignal.timeout(12_000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ transcript: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '' })
      }
    }

    const groqSlot = [
      { provider: settings?.primaryProvider, key: settings?.primaryApiKey },
      { provider: settings?.fallback1Provider, key: settings?.fallback1ApiKey },
      { provider: settings?.fallback2Provider, key: settings?.fallback2ApiKey },
    ].find((slot) => slot.provider === 'groq' && slot.key)
    const groqKey = groqSlot?.key ? decryptSecret(groqSlot.key) : ''
    if (groqKey) {
      const groqFormData = new FormData()
      groqFormData.append('file', audioFile, 'audio.webm')
      groqFormData.append('model', 'whisper-large-v3-turbo')
      groqFormData.append('language', 'en')

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: groqFormData,
        signal: AbortSignal.timeout(15_000),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ transcript: data.text || '' })
      }
    }

    const sidecar = process.env.JARVIS_SIDECAR_URL || process.env.FASTAPI_URL || 'http://localhost:8000'
    const local = new FormData()
    local.append('audio', audioFile, 'audio.webm')
    const res = await fetch(`${sidecar}/api/jarvis/stt`, { method: 'POST', body: local, signal: AbortSignal.timeout(20_000) })
    if (res.ok) return NextResponse.json(await res.json())

    return NextResponse.json({ error: 'No speech recognition engine is available' }, { status: 503 })
  } catch (error) {
    console.error('STT Error:', error)
    return NextResponse.json({ transcript: '' })
  }
}
