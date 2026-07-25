import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || searchParams.get('house')
  const status = searchParams.get('status')

  const products = await db.product.findMany({
    where: {
      organizationId: auth.organization.id,
      ...(category && category !== 'ALL' ? { 
        OR: [{ category }, { house: category }] 
      } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}
