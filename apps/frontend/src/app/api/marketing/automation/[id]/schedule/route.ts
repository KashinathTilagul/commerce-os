export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'

const ScheduleSchema = z.object({
  scheduledAt: z.string().optional(),
  platforms: z.array(z.string()).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await req.json()
    const { scheduledAt, platforms } = ScheduleSchema.parse(body)

    const task = await db.marketingTask.findFirst({
      where: { id, organizationId: auth.organizationId },
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    if (task.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Content must be approved before scheduling' }, { status: 400 })
    }

    const updated = await db.marketingTask.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        platforms: platforms || task.platforms,
      },
    })

    // TODO: Integrate with actual social media APIs (Buffer, Later, Hootsuite, or direct APIs)

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_CONTENT_SCHEDULED',
        actorName: 'Founder',
        summary: `Scheduled marketing content: ${task.title} for ${updated.scheduledAt?.toISOString()}`,
        payload: JSON.stringify({ taskId: task.id, scheduledAt: updated.scheduledAt, platforms: updated.platforms }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scheduling failed' }, { status: 500 })
  }
}