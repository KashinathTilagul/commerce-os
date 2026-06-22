import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const house = searchParams.get('house')
  const status = searchParams.get('status')

  const products = await db.product.findMany({
    where: {
      ...(house && house !== 'ALL' ? { house } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}
