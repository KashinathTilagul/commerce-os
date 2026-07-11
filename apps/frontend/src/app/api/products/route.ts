import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const house = searchParams.get('house')
  const status = searchParams.get('status')

  const products = await db.product.findMany({
    where: {
      userId: auth.user.id,
      ...(house && house !== 'ALL' ? { house } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}
