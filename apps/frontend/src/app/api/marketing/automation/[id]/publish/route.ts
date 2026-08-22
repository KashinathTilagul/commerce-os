export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { publishMarketingTask } from '@/lib/marketing-task-publisher'

// POST /api/marketing/automation/[id]/publish — publish the draft to every
// connected social account selected on the task, right now.
export async function POST(
  _req: NextRequest,
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
    if (!['READY', 'APPROVED', 'SCHEDULED'].includes(task.status)) {
      return NextResponse.json({ error: `Cannot publish a task in status ${task.status}` }, { status: 400 })
    }

    const { task: updated, results, anySuccess } = await publishMarketingTask(task)
    return NextResponse.json({ task: updated, results, published: anySuccess }, { status: anySuccess ? 200 : 422 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Publish failed' }, { status: 500 })
  }
}
