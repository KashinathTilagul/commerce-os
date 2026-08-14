import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROSTER } from '@/lib/agent-roster'
import { syncAgentRoster } from '@/lib/agent-roster-sync'

export const dynamic = 'force-dynamic'

// Idempotently build the digital-employees org (Chiefs + specialists, with
// hierarchy) for every user. Guarded by CRON_SECRET like /api/cron/watchdog;
// triggered once from the box after a deploy. Safe to re-run.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizations = await db.organization.findMany({ select: { id: true } })
  let count = 0

  for (const organization of organizations) {
    count += await syncAgentRoster(db, organization.id)
  }

  return NextResponse.json({ ok: true, applied: count, roster: ROSTER.length })
}
