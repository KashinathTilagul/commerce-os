export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function DELETE(
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

    await db.marketingTask.delete({ where: { id } })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_CONTENT_DELETED',
        actorName: 'Founder',
        summary: `Deleted marketing content: ${task.title}`,
        payload: JSON.stringify({ taskId: task.id, code: task.code }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 })
  }
}