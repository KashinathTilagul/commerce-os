import { NextResponse } from 'next/server'

// Render health check — enables zero-downtime deploys (old instance stays up
// until this returns 200 on the new one).
export async function GET() {
  return NextResponse.json({ ok: true })
}
