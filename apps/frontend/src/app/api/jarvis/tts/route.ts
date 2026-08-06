export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Returns 501 Not Implemented so frontend client cleanly falls back to browser SpeechSynthesis
  return NextResponse.json({ error: 'Server TTS endpoint not configured; use browser SpeechSynthesis' }, { status: 501 })
}
