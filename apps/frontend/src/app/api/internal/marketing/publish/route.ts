import { NextRequest, NextResponse } from 'next/server'
import { publishDueMarketing } from '@/lib/social-publisher'

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  try { return NextResponse.json({ results: await publishDueMarketing(body.organizationId || undefined) }) }
  catch (error: any) { return NextResponse.json({ error: error.message || 'Publishing failed' }, { status: 500 }) }
}
