import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'TTS endpoint routed to FastAPI' }, { status: 200 })
}
