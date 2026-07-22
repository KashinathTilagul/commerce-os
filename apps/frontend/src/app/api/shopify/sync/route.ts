import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { executeTool } from '@/lib/composio-service'

function mapStatus(fulfillmentStatus: string | null): string {
  if (!fulfillmentStatus) return 'NEW'
  if (fulfillmentStatus === 'fulfilled') return 'SHIPPED'
  if (fulfillmentStatus === 'partial') return 'PROCESSING'
  return 'PROCESSING'
}

function mapPayment(financialStatus: string | null): string {
  if (financialStatus === 'paid') return 'PAID'
  if (financialStatus === 'refunded') return 'REFUNDED'
  return 'PENDING'
}

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const uid = auth.user.id

  const result = await executeTool({
    userId: uid,
    toolkitSlug: 'shopify',
    toolSlug: 'shopify_get_orders',
    agentCode: 'FOUNDER',
    agentName: 'Founder',
    input: { status: 'any', limit: 250 },
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const orders: any[] = result.output?.orders || []
  let synced = 0

  for (const o of orders) {
    const orderNumber = String(o.name || o.id)
    const customerName = o.customer
      ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() || 'Unknown'
      : 'Unknown'

    await db.order.upsert({
      where: { userId_orderNumber: { userId: uid, orderNumber } },
      create: {
        userId: uid,
        orderNumber,
        customerName,
        customerEmail: o.customer?.email || '',
        customerCity: o.shipping_address?.city || '',
        channel: 'D2C',
        itemsCount: o.line_items?.length || 0,
        total: parseFloat(o.total_price || '0'),
        status: mapStatus(o.fulfillment_status),
        paymentStatus: mapPayment(o.financial_status),
      },
      update: {
        status: mapStatus(o.fulfillment_status),
        paymentStatus: mapPayment(o.financial_status),
        total: parseFloat(o.total_price || '0'),
        itemsCount: o.line_items?.length || 0,
      },
    })
    synced++
  }

  await db.event.create({
    data: {
      userId: uid,
      type: 'SHOPIFY_SYNC',
      actorName: 'Shopify',
      summary: `Synced ${synced} orders from Shopify`,
      payload: JSON.stringify({ synced, total: orders.length }),
      severity: 'INFO',
    },
  })

  return NextResponse.json({ synced, total: orders.length })
}
