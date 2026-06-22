import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { initiateConnection } from '@/lib/composio-service'

// POST /api/integrations/[toolkit]/connect — connect or disconnect an integration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const { toolkit } = await params
  const body = await req.json().catch(() => ({}))
  const { action } = body as { action?: 'connect' | 'disconnect' }

  const integration = await db.integration.findUnique({
    where: { toolkitSlug: toolkit },
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
  const connection = await initiateConnection(toolkit, 'ekvaar_founder')
  
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

  // Demo mode fallback — simulate a successful connection immediately
  const updated = await db.integration.update({
    where: { id: integration.id },
    data: {
      isConnected: true,
      connectedAt: new Date(),
      connectedAccountId: `ca_${toolkit}_${Date.now()}`,
    },
  })

  // Log the connection event
  await db.event.create({
    data: {
      type: 'INTEGRATION_CONNECTED',
      actorName: 'Founder',
      summary: `Connected ${integration.name} to EKVAAR OS (Demo Mode)`,
      payload: JSON.stringify({ toolkit, connectedAccountId: updated.connectedAccountId }),
      severity: 'INFO',
    },
  })

  eventBus.emit('integration_updated', { toolkit, action: 'connected' })
  return NextResponse.json({ success: true, integration: updated, action: 'connected' })
}

// PATCH /api/integrations/[toolkit]/connect — update agent permissions
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const { toolkit } = await params
  const body = await req.json()
  const { agentPermissions } = body

  const integration = await db.integration.findUnique({
    where: { toolkitSlug: toolkit },
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
