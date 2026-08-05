export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { getGoalWithIterations, pauseGoal, resumeGoal, runGoalIteration } from '@/lib/goal-engine'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const goal = await getGoalWithIterations(auth.organizationId, id)
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  return NextResponse.json(goal)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const body = await req.json()
  const { action, measuredValue } = body

  if (action === 'pause') {
    const updated = await pauseGoal(id)
    return NextResponse.json(updated)
  }
  if (action === 'resume') {
    const updated = await resumeGoal(id)
    return NextResponse.json(updated)
  }
  if (action === 'iterate') {
    const iteration = await runGoalIteration(id, measuredValue)
    return NextResponse.json(iteration)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  await db.goal.deleteMany({ where: { id, organizationId: auth.organizationId } })
  return NextResponse.json({ success: true })
}
