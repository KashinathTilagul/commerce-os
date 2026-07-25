import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { computeRisks } from '@/lib/risk-engine'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const risks = await computeRisks(auth.user.id)
  return NextResponse.json({ risks })
}
