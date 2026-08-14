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

    return NextResponse.json({ error: 'Configure a Groq key for server transcription, or use supported browser speech recognition.' }, { status: 503 })
  } catch (error) {
    console.error('STT Error:', error)
    return NextResponse.json({ transcript: '' })
  }
}
