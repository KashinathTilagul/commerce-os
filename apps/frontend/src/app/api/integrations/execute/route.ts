import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeObject } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { executeTool, AGENT_TOOLKIT_ACCESS } from '@/lib/composio-service'
import { z } from 'zod'

const ExecuteSchema = z.object({
  toolkitSlug: z.string().min(1).max(50),
  toolSlug: z.string().min(1).max(100),
  agentCode: z.string().min(1).max(20),
  agentName: z.string().max(50).optional(),
  input: z.record(z.string(), z.any()).optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const body = await req.json()
    const sanitized = sanitizeObject(body, { maxLength: 10000 })
    const validated = ExecuteSchema.parse(sanitized)
    const { toolkitSlug, toolSlug, agentCode, agentName, input } = validated

    const allowedToolkits = AGENT_TOOLKIT_ACCESS[agentCode] || []
    if (!allowedToolkits.includes(toolkitSlug)) {
      return createApiError(`Agent ${agentCode} does not have access to ${toolkitSlug}`, 403)
    }

    const integration = await db.integration.findFirst({
      where: { organizationId: authResult.user.id, toolkitSlug },
    })

    if (!integration || !integration.isConnected) {
      return createApiError(`${integration?.name || toolkitSlug} is not connected`, 400)
    }

    const execution = await db.toolExecution.create({
      data: {
        integrationId: integration.id,
        agentCode,
        agentName: agentName || agentCode,
        toolName: toolSlug,
        toolSlug,
        input: JSON.stringify(input || {}),
        status: 'PENDING',
      },
    })

    const result = await executeTool({
      organizationId: authResult.user.id,
      toolkitSlug,
      toolSlug,
      agentCode,
      agentName: agentName || agentCode,
      input: input || {},
    })

    const updated = await db.toolExecution.update({
      where: { id: execution.id },
      data: {
        status: result.success ? 'SUCCESS' : 'ERROR',
        output: result.output ? JSON.stringify(result.output) : null,
        errorMessage: result.error || null,
        duration: result.duration,
      },
    })

    await db.integration.update({
      where: { id: integration.id },
      data: { executionsCount: { increment: 1 } },
    })

    await db.event.create({
      data: {
        organizationId: authResult.user.id,
        type: 'TOOL_EXECUTION',
        actorName: agentName || agentCode,
        summary: `${agentName || agentCode} executed ${toolSlug} on ${integration.name} → ${result.success ? 'SUCCESS' : 'ERROR'}`,
        payload: JSON.stringify({
          executionId: updated.id,
          toolkit: toolkitSlug,
          tool: toolSlug,
          duration: result.duration,
          success: result.success,
        }),
        severity: result.success ? 'INFO' : 'WARN',
      },
    })

    return createApiResponse({
      executionId: updated.id,
      success: result.success,
      output: result.output,
      error: result.error,
      duration: result.duration,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createApiError('Validation error', 400)
    }
    console.error('[API] Integration execute error:', error)
    return createApiError('Failed to execute tool', 500)
  }
}
