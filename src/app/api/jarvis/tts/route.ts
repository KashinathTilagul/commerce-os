import { NextRequest, NextResponse } from 'next/server'

// POST /api/jarvis/tts — Generate speech audio from text
export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    // Truncate to 1024 chars (API limit)
    const truncated = text.slice(0, 1000)

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const response = await zai.audio.tts.create({
      input: truncated,
      voice: voice || 'xiaochen', //沉稳专业 — calm professional voice
      speed: 1.0,
      response_format: 'wav',
      stream: false,
    })

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e: any) {
    console.error('Jarvis TTS error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
