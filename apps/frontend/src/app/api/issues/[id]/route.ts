export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// PATCH /api/issues/[id] — change status, assignee, priority
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const existing = await db.issue.findUnique({ where: { id } })
  if (!existing || existing.organizationId !== auth.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { status, priority, assigneeId } = body as { status?: string; priority?: string; assigneeId?: string | null }

  const data: any = {}
  if (status) data.status = status
  if (priority) data.priority = priority
  if ('assigneeId' in body) {
    if (assigneeId) {
      const assignee = await db.agent.findFirst({ where: { id: assigneeId, organizationId: auth.organizationId } })
      if (!assignee) return NextResponse.json({ error: 'Assignee not found' }, { status: 400 })
    }
    data.assigneeId = assigneeId || null
  }

  const updated = await db.issue.update({
    where: { id },
    data,
  })

  if (status || 'assigneeId' in body) {
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: status ? 'ISSUE_STATUS_CHANGE' : 'ISSUE_ASSIGNED',
        actorName: 'Founder',
        summary: status ? `${updated.code} → ${status}` : `${updated.code} assignee updated`,
        payload: JSON.stringify({ issueCode: updated.code, status, assigneeId: data.assigneeId }),
        severity: 'INFO',
      },
    })
  }

  return NextResponse.json(updated)
}
