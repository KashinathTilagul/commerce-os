import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const response = await fetch(`${process.env.GOOGLE_WORKSPACE_API_URL || 'http://google-workspace:8091'}/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET! },
    body: JSON.stringify(await req.json()),
    signal: AbortSignal.timeout(125000),
  })
  return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': 'application/json' } })
}
