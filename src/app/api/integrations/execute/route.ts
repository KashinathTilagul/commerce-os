import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeTool, AGENT_TOOLKIT_ACCESS } from '@/lib/composio-service'

// POST /api/integrations/execute — execute a tool via Composio
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { toolkitSlug, toolSlug, agentCode, agentName, input } = body

  if (!toolkitSlug || !toolSlug || !agentCode) {
    return NextResponse.json({ error: 'Missing required fields: toolkitSlug, toolSlug, agentCode' }, { status: 400 })
  }

  // Verify agent has access to this toolkit
  const allowedToolkits = AGENT_TOOLKIT_ACCESS[agentCode] || []
  if (!allowedToolkits.includes(toolkitSlug)) {
    return NextResponse.json({
      error: `Agent ${agentCode} does not have access to ${toolkitSlug}. Allowed: ${allowedToolkits.join(', ')}`,
    }, { status: 403 })
  }

  // Find the integration
  const integration = await db.integration.findUnique({
    where: { toolkitSlug },
  })

  if (!integration || !integration.isConnected) {
    return NextResponse.json({ error: `${integration?.name || toolkitSlug} is not connected` }, { status: 400 })
  }

  // Create a pending execution record
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

  // Execute the tool
  const result = await executeTool({
    toolkitSlug,
    toolSlug,
    agentCode,
    agentName: agentName || agentCode,
    input: input || {},
  })

  // Update the execution record
  const updated = await db.toolExecution.update({
    where: { id: execution.id },
    data: {
      status: result.success ? 'SUCCESS' : 'ERROR',
      output: result.output ? JSON.stringify(result.output) : null,
      errorMessage: result.error || null,
      duration: result.duration,
    },
  })

  // Update integration execution count
  await db.integration.update({
    where: { id: integration.id },
    data: { executionsCount: { increment: 1 } },
  })

  // Log to event bus
  await db.event.create({
    data: {
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

  return NextResponse.json({
    executionId: updated.id,
    success: result.success,
    output: result.output,
    error: result.error,
    duration: result.duration,
  })
}
