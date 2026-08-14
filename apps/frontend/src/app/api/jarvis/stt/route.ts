export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob | null

    if (!audioFile) {
      return NextResponse.json({ transcript: '' })
    }

    const groqKey = process.env.GROQ_API_KEY
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
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ transcript: data.text || '' })
      }
    }

    return NextResponse.json({ transcript: '' })
  } catch (error) {
    console.error('STT Error:', error)
    return NextResponse.json({ transcript: '' })
  }
}
