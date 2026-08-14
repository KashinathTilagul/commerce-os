export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { computeRisks } from '@/lib/risk-engine'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const risks = await computeRisks(auth.organizationId)
  return NextResponse.json({ risks })
}
