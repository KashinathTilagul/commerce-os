import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROSTER } from '@/lib/agent-roster'
import { syncAgentRoster } from '@/lib/agent-roster-sync'
import { requireOrganization } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

// Idempotently build the requesting organization's workforce only. A tenant
// must never provision or mutate another tenant's employee graph.
export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const count = await syncAgentRoster(db, auth.organizationId)

  return NextResponse.json({ ok: true, applied: count, roster: ROSTER.length })
}
