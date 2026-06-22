import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    return NextResponse.json({ success: true, integration: updated, action: 'disconnected' })
  }

  // Connect — in production this would redirect to Composio OAuth flow
  // For demo, we simulate a successful connection
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
      summary: `Connected ${integration.name} to EKVAAR OS`,
      payload: JSON.stringify({ toolkit, connectedAccountId: updated.connectedAccountId }),
      severity: 'INFO',
    },
  })

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
