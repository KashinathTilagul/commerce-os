import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { computeRisks } from '@/lib/risk-engine'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const risks = await computeRisks(auth.user.id)
  const summary = {
    critical: risks.filter(r => r.risk_level === 'CRITICAL').length,
    high: risks.filter(r => r.risk_level === 'HIGH').length,
    medium: risks.filter(r => r.risk_level === 'MEDIUM').length,
    low: risks.filter(r => r.risk_level === 'LOW').length,
    total_active: risks.length,
  }
  const by_category: Record<string, { total: number; critical: number; high: number; medium: number; low: number }> = {}
  for (const r of risks) {
    const c = (by_category[r.category] ??= { total: 0, critical: 0, high: 0, medium: 0, low: 0 })
    c.total++
    c[r.risk_level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low']++
  }

  return NextResponse.json({ summary, by_category, top_risks: risks.slice(0, 5) })
}
