export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const goals = await db.goal.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        iterations: { orderBy: { iteration: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ goals })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, metric, targetValue, unit, mode, agentCode } = body

    const goal = await db.goal.create({
      data: {
        organizationId: auth.organizationId,
        title,
        metric: metric || 'general_metric',
        targetValue: parseFloat(targetValue) || 100,
        unit: unit || '',
        mode: mode || 'ACHIEVE',
        agentCode: agentCode || 'CEO',
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create goal' }, { status: 500 })
  }
}
