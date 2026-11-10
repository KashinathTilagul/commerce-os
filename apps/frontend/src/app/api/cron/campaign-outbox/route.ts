export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { campaignLaunchesEnabled } from '@/lib/campaign-feature'
import { dispatchOutboxBatch } from '@/lib/campaign-outbox'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function POST(req: NextRequest) {
  if (!campaignLaunchesEnabled()) {
    return NextResponse.json({ error: 'Campaign launches are not enabled' }, { status: 404 })
  }

  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (!isCronAuthorized(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await dispatchOutboxBatch(20)
  return NextResponse.json({
    claimed: results.length,
    dispatched: results.filter((result) => result.dispatched).length,
    failed: results.filter((result) => !result.dispatched).length,
  })
}
