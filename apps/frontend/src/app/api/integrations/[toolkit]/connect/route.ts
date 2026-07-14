import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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

  // No redirect URL and no error — shouldn't happen but handle it
  return NextResponse.json({ 
    error: 'Composio returned no redirect URL. The integration may not support OAuth or is not configured on the Composio dashboard.' 
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
