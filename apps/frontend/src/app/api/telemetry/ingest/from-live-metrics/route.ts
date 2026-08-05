export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

// ponytail: risks/signals are computed live on GET from real tables (see risk-engine.ts),
// so there's no separate ingestion step to run — this just satisfies the UI's call.
export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  return NextResponse.json({ status: 'success', metrics_ingested: 0 })
}
