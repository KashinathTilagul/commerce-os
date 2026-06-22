import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/issues/[id] — change status, assignee, priority
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { status, priority } = body as { status?: string; priority?: string }

  const data: any = {}
  if (status) data.status = status
  if (priority) data.priority = priority

  const updated = await db.issue.update({
    where: { id },
    data,
  })

  if (status) {
    await db.event.create({
      data: {
        type: 'ISSUE_STATUS_CHANGE',
        actorName: 'Founder',
        summary: `${updated.code} → ${status}`,
        payload: JSON.stringify({ issueCode: updated.code, status }),
        severity: 'INFO',
      },
    })
  }

  return NextResponse.json(updated)
}
