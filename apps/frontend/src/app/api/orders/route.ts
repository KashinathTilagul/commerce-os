import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const channel = searchParams.get('channel')

  const orders = await db.order.findMany({
    where: {
      organizationId: auth.user.id,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(channel && channel !== 'ALL' ? { channel } : {}),
    },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(orders)
}
