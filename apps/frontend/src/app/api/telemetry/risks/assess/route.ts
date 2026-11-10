export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { computeRisks } from '@/lib/risk-engine'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const risks = await computeRisks(auth.organizationId)
  const summary = {
    total: risks.length,
    critical: risks.filter((r) => r.risk_level === 'CRITICAL').length,
    high: risks.filter((r) => r.risk_level === 'HIGH').length,
    medium: risks.filter((r) => r.risk_level === 'MEDIUM').length,
    low: risks.filter((r) => r.risk_level === 'LOW').length,
  }

  return NextResponse.json({
    ok: true,
    assessedAt: new Date().toISOString(),
    summary,
    risks,
  })
}
