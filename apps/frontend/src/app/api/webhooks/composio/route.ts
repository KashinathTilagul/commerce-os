export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { boundedEventPayload, identifyComposioDelivery } from '@/lib/composio-trigger'
import { verifyComposioWebhook } from '@/lib/composio-service'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const webhookId = request.headers.get('webhook-id')
  const timestamp = request.headers.get('webhook-timestamp')
  const signature = request.headers.get('webhook-signature')
  if (!webhookId || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing Composio signature headers' }, { status: 401 })
  }

  let untrustedPayload: unknown
  try {
    untrustedPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const identity = identifyComposioDelivery(untrustedPayload)
  const integration = identity.connectedAccountId
    ? await db.integration.findFirst({
        where: { connectedAccountId: identity.connectedAccountId, isConnected: true },
        select: { organizationId: true, name: true, toolkitSlug: true },
      })
    : null
  if (!integration || (identity.userId && identity.userId !== integration.organizationId)) {
    return NextResponse.json({ error: 'Unknown connected account' }, { status: 404 })
  }

  try {
    const verified = await verifyComposioWebhook({
      organizationId: integration.organizationId,
      payload: rawBody,
      id: webhookId,
      timestamp,
      signature,
    })
    const eventId = `composio_${webhookId}`
    try {
      await db.event.create({
        data: {
          id: eventId,
          organizationId: integration.organizationId,
          type: identity.eventType === 'composio.trigger.message' ? 'COMPOSIO_TRIGGER_RECEIVED' : 'COMPOSIO_CONNECTION_EVENT',
          actorName: `Composio · ${integration.name}`,
          summary: identity.triggerSlug
            ? `${identity.triggerSlug} received from ${integration.name}`
            : `${identity.eventType || 'Composio event'} received from ${integration.name}`,
          payload: boundedEventPayload({
            webhookId,
            version: verified.version,
            triggerSlug: identity.triggerSlug,
            toolkit: integration.toolkitSlug,
            data: verified.rawPayload,
          }),
          severity: 'INFO',
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ received: true, duplicate: true })
      }
      throw error
    }
    return NextResponse.json({ received: true, eventId })
  } catch (error) {
    console.error('[Composio webhook]', error)
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 401 })
  }
}
