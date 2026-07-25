import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const hours = Number(req.nextUrl.searchParams.get('hours') || 24)
  const since = new Date(Date.now() - hours * 3600000)

  const events = await db.event.findMany({
    where: { organizationId: auth.user.id, severity: { in: ['WARN', 'ERROR', 'CRITICAL'] }, timestamp: { gte: since } },
    orderBy: { timestamp: 'desc' },
    take: 50,
  })

  const signals = events.map(e => ({
    id: e.id,
    severity: e.severity === 'ERROR' ? 'HIGH' : e.severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
    message: e.summary,
    signal_type: e.type,
    metric_name: e.type,
  }))

  return NextResponse.json({ signals })
}
