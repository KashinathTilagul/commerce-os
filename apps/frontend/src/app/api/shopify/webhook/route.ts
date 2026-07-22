import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

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

export async function POST(req: NextRequest) {
  let payload: any

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (secret) {
    const raw = await req.text()
    const hmac = req.headers.get('x-shopify-hmac-sha256') || ''
    const computed = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('base64')
    if (hmac !== computed) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    payload = JSON.parse(raw)
  } else {
    payload = await req.json()
  }

  const topic = req.headers.get('x-shopify-topic') || ''
  if (!topic.startsWith('orders/')) return NextResponse.json({ ok: true })

  const orderNumber = String(payload.name || payload.id)
  const existing = await db.order.findFirst({ where: { orderNumber } })
  if (!existing) return NextResponse.json({ ok: true })

  await db.order.update({
    where: { id: existing.id },
    data: {
      status: mapStatus(payload.fulfillment_status),
      paymentStatus: mapPayment(payload.financial_status),
    },
  })

  return NextResponse.json({ ok: true })
}
