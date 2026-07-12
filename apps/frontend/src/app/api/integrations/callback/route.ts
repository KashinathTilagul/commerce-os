import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/integrations/callback — OAuth callback from Composio
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const connectedAccountId = searchParams.get('connected_account_id')
  const toolkitSlug = searchParams.get('toolkit')
  
  if (status !== 'SUCCESS' || !connectedAccountId || !toolkitSlug) {
    console.error('[Composio] Callback failed or missing data:', Object.fromEntries(searchParams.entries()))
    return NextResponse.redirect(new URL('/desktop?error=integration_failed', req.url))
  }

  try {
    
    // Update local DB
    const integration = await db.integration.findFirst({
      where: { userId: auth.user.id, toolkitSlug }
    })

    if (integration) {
      await db.integration.update({
        where: { id: integration.id },
        data: {
          isConnected: true,
          connectedAt: new Date(),
          connectedAccountId: connectedAccountId,
        }
      })

      // Log the event
      await db.event.create({
        data: {
          userId: auth.user.id,
          type: 'INTEGRATION_CONNECTED',
          actorName: 'Founder',
          summary: `Connected ${integration.name} to EKVAAR OS`,
          payload: JSON.stringify({ toolkit: toolkitSlug, connectedAccountId }),
          severity: 'INFO',
        },
      })

      eventBus.emit('integration_updated', { toolkit: toolkitSlug, action: 'connected' })
    }

    // Redirect back to desktop
    return NextResponse.redirect(new URL('/desktop?success=integration_connected', req.url))
  } catch (err: any) {
    console.error('[Composio] Callback processing error:', err)
    return NextResponse.redirect(new URL('/desktop?error=integration_failed', req.url))
  }
}
