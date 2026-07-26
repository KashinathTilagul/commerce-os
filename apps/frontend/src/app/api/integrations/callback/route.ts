import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// GET /api/integrations/callback — OAuth callback from Composio
export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) {
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const connectedAccountId = searchParams.get('connected_account_id')
  const toolkitSlug = searchParams.get('toolkit')
  
  const isSuccess = status?.toUpperCase() === 'SUCCESS' || status?.toLowerCase() === 'success'
  
  if (!isSuccess || !connectedAccountId || !toolkitSlug) {
    const errorDetails = searchParams.toString()
    console.error('[Composio] Callback failed or missing data:', Object.fromEntries(searchParams.entries()))
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL(`/?error=integration_failed&details=${encodeURIComponent(errorDetails)}`, baseUrl))
  }

  try {
    
    // Update local DB
    const integration = await db.integration.findFirst({
      where: { organizationId: auth.organizationId, toolkitSlug }
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
          organizationId: auth.organizationId,
          type: 'INTEGRATION_CONNECTED',
          actorName: 'Founder',
          summary: `Connected ${integration.name} to EKVAAR OS`,
          payload: JSON.stringify({ toolkit: toolkitSlug, connectedAccountId }),
          severity: 'INFO',
        },
      })

    }

    // Redirect back to desktop
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL('/?success=integration_connected', baseUrl))
  } catch (err: any) {
    console.error('[Composio] Callback processing error:', err)
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin
    return NextResponse.redirect(new URL(`/?error=integration_failed&details=${encodeURIComponent(err.message || 'unknown')}`, baseUrl))
  }
}
