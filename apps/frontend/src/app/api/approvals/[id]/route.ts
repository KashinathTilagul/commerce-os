import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// PATCH /api/approvals/[id] — approve / reject / request revision
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const existing = await db.approval.findUnique({ where: { id } })
  if (!existing || existing.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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
      userId: auth.user.id,
      type: action === 'approve' ? 'APPROVAL_GRANTED' : action === 'reject' ? 'APPROVAL_REJECTED' : 'APPROVAL_REVISION',
      actorName: 'Founder',
      summary: `${updated.code}: ${status.replace(/_/g, ' ').toLowerCase()}`,
      payload: JSON.stringify({ approvalCode: updated.code, action }),
      severity: action === 'reject' ? 'WARN' : 'INFO',
    },
  })

  return NextResponse.json(updated)
}
