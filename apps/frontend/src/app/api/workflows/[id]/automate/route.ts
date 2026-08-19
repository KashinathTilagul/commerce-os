export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { workflowAutomation } from '@/lib/workflow-automation'
import { z } from 'zod'

const AutomationEventSchema = z.object({
  eventType: z.enum(['TASK_COMPLETED', 'WORKFLOW_TRIGGER', 'TASK_FAILED']),
  taskId: z.string().optional(),
  success: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id: workflowId } = await params

  try {
    const parsed = AutomationEventSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid automation event' }, { status: 400 })
    }

    const { eventType, taskId, success } = parsed.data

    // Verify workflow belongs to organization
    const workflow = await db.workflow.findFirst({
      where: { 
        id: workflowId,
        organizationId: auth.organizationId 
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Process automation event
    switch (eventType) {
      case 'TASK_COMPLETED':
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required for TASK_COMPLETED event' }, { status: 400 })
        }
        await workflowAutomation.completeTask(taskId, success !== false)
        break

      case 'TASK_FAILED':
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required for TASK_FAILED event' }, { status: 400 })
        }
        await workflowAutomation.completeTask(taskId, false)
        break

      case 'WORKFLOW_TRIGGER':
        await workflowAutomation.triggerWorkflow(workflowId)
        break

      default:
        return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Automation event processed successfully',
      workflowId,
      eventType 
    })

  } catch (error: any) {
    console.error('[WorkflowAutomation] Error processing automation event:', error)
    return NextResponse.json({ error: error.message || 'Failed to process automation event' }, { status: 500 })
  }
}