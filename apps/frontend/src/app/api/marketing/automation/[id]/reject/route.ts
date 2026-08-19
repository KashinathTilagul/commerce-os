export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    const task = await db.marketingTask.findFirst({
      where: { id, organizationId: auth.organizationId },
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const updated = await db.marketingTask.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_CONTENT_REJECTED',
        actorName: 'Founder',
        summary: `Rejected marketing content: ${task.title}`,
        payload: JSON.stringify({ taskId: task.id }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Rejection failed' }, { status: 500 })
  }
}