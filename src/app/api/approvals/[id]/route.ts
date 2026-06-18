import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/approvals/[id] — approve / reject / request revision
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { action } = body as { action: 'approve' | 'reject' | 'revision' }

  const statusMap = {
    approve: 'APPROVED',
    reject: 'REJECTED',
    revision: 'REVISION_REQUESTED',
  } as const

  const status = statusMap[action]
  if (!status) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updated = await db.approval.update({
    where: { id },
    data: {
      status,
      isRead: true,
      resolvedAt: new Date(),
      inbox: 'RECENT',
    },
  })

  await db.event.create({
    data: {
      type: action === 'approve' ? 'APPROVAL_GRANTED' : action === 'reject' ? 'APPROVAL_REJECTED' : 'APPROVAL_REVISION',
      actorName: 'Founder',
      summary: `${updated.code}: ${status.replace(/_/g, ' ').toLowerCase()}`,
      payload: JSON.stringify({ approvalCode: updated.code, action }),
      severity: action === 'reject' ? 'WARN' : 'INFO',
    },
  })

  return NextResponse.json(updated)
}
