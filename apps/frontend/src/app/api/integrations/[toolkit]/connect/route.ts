import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { initiateConnection } from '@/lib/composio-service'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/integrations/[toolkit]/connect — connect or disconnect an integration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { toolkit } = await params
  const body = await req.json().catch(() => ({}))
  const { action } = body as { action?: 'connect' | 'disconnect' }

  const integration = await db.integration.findFirst({
    where: { userId: auth.user.id, toolkitSlug: toolkit },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  if (action === 'disconnect') {
    const updated = await db.integration.update({
      where: { id: integration.id },
      data: {
        isConnected: false,
        connectedAt: null,
        connectedAccountId: null,
      },
    })
    eventBus.emit('integration_updated', { toolkit, action: 'disconnected' })
    return NextResponse.json({ success: true, integration: updated, action: 'disconnected' })
  }

  // Connect — attempt real Composio connection
  const connection = await initiateConnection(toolkit, auth.user.id)

  if (connection.redirectUrl) {
    // We have a real Composio API key and an OAuth flow is needed
    return NextResponse.json({
      success: true,
      action: 'redirect',
      redirectUrl: connection.redirectUrl
    })
  }

  if (connection.error) {
    return NextResponse.json({ error: connection.error }, { status: 500 })
  }

  // If we reach here, we neither redirected nor encountered a Composio error,
  // which means Composio is likely unconfigured or returned an empty response.
  return NextResponse.json({ 
    error: 'Composio connection could not be initiated. Please verify your API key.' 
  }, { status: 500 })
}

// PATCH /api/integrations/[toolkit]/connect — update agent permissions
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { toolkit } = await params
  const body = await req.json()
  const { agentPermissions } = body

  const integration = await db.integration.findFirst({
    where: { userId: auth.user.id, toolkitSlug: toolkit },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const updated = await db.integration.update({
    where: { id: integration.id },
    data: { agentPermissions: agentPermissions || '' },
  })

  return NextResponse.json({ success: true, integration: updated })
}
