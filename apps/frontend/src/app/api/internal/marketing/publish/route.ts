import { NextRequest, NextResponse } from 'next/server'
import { publishDueMarketing } from '@/lib/social-publisher'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  try { return NextResponse.json({ results: await publishDueMarketing(body.organizationId || undefined) }) }
  catch (error: any) { return NextResponse.json({ error: error.message || 'Publishing failed' }, { status: 500 }) }
}
