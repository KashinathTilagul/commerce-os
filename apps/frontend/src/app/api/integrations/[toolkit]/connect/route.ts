import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { initiateConnection, TOOLKIT_CATALOG } from '@/lib/composio-service'
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

  let integration = await db.integration.findFirst({
    where: { userId: auth.user.id, toolkitSlug: toolkit },
  })

  if (!integration) {
    // Row missing (seeding was incomplete) — create it on demand from the catalog
    const meta = TOOLKIT_CATALOG.find(t => t.slug === toolkit)
    if (!meta) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }
    integration = await db.integration.create({
      data: {
        userId: auth.user.id,
        toolkitSlug: toolkit,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        logo: meta.logo,
        toolsCount: meta.toolsCount,
        isConnected: false,
        agentPermissions: '',
      },
    })
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
    return NextResponse.json({ success: true, action: 'redirect', redirectUrl: connection.redirectUrl })
  }

  if (connection.connectedAccountId) {
    // Already connected in Composio — sync state to local DB
    const updated = await db.integration.update({
      where: { id: integration.id },
      data: { isConnected: true, connectedAt: new Date(), connectedAccountId: connection.connectedAccountId },
    })
    return NextResponse.json({ success: true, action: 'connected', integration: updated })
  }

  if (connection.error) {
    return NextResponse.json({ error: connection.error }, { status: 500 })
  }

  return NextResponse.json({ error: 'Composio returned no redirect URL. The integration may not support OAuth or is not configured on the Composio dashboard.' }, { status: 500 })
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

  if (!integration) return NextResponse.json({ error: 'Integration not found' }, { status: 404 })

  const updated = await db.integration.update({
    where: { id: integration.id },
    data: { agentPermissions: agentPermissions || '' },
  })

  return NextResponse.json({ success: true, integration: updated })
}
