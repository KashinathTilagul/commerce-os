import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { createGoal, getDueGoals } from '@/lib/goal-engine'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const dueOnly = searchParams.get('due') === 'true'

  if (dueOnly) {
    const due = await getDueGoals()
    return NextResponse.json(due)
  }

  const goals = await db.goal.findMany({
    where: { organizationId: auth.user.id },
    include: { iterations: { orderBy: { createdAt: 'desc' }, take: 10 } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, metric, targetValue, unit, mode, agentCode, skillSlug, interval, deadline } = body

    if (!title || !metric || targetValue === undefined || !mode || !agentCode) {
      return NextResponse.json({ error: 'Missing required goal fields' }, { status: 400 })
    }

    const goal = await createGoal(auth.user.id, {
      title,
      metric,
      targetValue: Number(targetValue),
      unit: unit || '',
      mode: mode === 'MAINTAIN' ? 'MAINTAIN' : 'ACHIEVE',
      agentCode,
      skillSlug: skillSlug || null,
      interval: interval ? Number(interval) : 86400,
      deadline: deadline ? new Date(deadline) : undefined,
    })

    return NextResponse.json(goal)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
