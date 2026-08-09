export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { campaignLaunchesEnabled } from '@/lib/campaign-feature'
import { dispatchOutboxBatch } from '@/lib/campaign-outbox'

export async function POST(req: NextRequest) {
  if (!campaignLaunchesEnabled()) {
    return NextResponse.json({ error: 'Campaign launches are not enabled' }, { status: 404 })
  }

  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await dispatchOutboxBatch(20)
  return NextResponse.json({
    claimed: results.length,
    dispatched: results.filter((result) => result.dispatched).length,
    failed: results.filter((result) => !result.dispatched).length,
  })
}
