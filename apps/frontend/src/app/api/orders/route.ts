export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const channel = searchParams.get('channel')

  const orders = await db.order.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(channel && channel !== 'ALL' ? { channel } : {}),
    },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(orders)
}
