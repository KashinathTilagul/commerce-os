export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CommerceMapper } from '@/lib/commerce/mapper'
import crypto from 'crypto'

function validSignature(raw: string, header: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest()
  const received = Buffer.from(header, 'base64')
  return received.length === computed.length && crypto.timingSafeEqual(received, computed)
}

export async function POST(req: NextRequest) {
  const raw = await req.text()

  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET
  const organizationId = process.env.WOOCOMMERCE_ORGANIZATION_ID
  if (!secret || !organizationId) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  {
    const signature = req.headers.get('x-wc-webhook-signature') || ''
    if (!validSignature(raw, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(raw)
  } catch {
    // WooCommerce sends a non-JSON ping when a webhook is first saved
    return NextResponse.json({ ok: true })
  }

  const topic = req.headers.get('x-wc-webhook-topic') || ''
  if (!topic.startsWith('order.') || !payload?.id) return NextResponse.json({ ok: true })

  const orderNumber = String(payload.number || payload.id)
  const existing = await db.order.findFirst({ where: { orderNumber, organizationId } })
  if (!existing) return NextResponse.json({ ok: true })

  const canonical = CommerceMapper.toCanonicalOrder(payload, existing.organizationId)
  await db.order.update({
    where: { id: existing.id },
    data: {
      status: canonical.status,
      paymentStatus: canonical.paymentStatus,
    },
  })

  return NextResponse.json({ ok: true })
}
