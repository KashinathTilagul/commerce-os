import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tier = searchParams.get('tier')

  const customers = await db.customer.findMany({
    where: tier && tier !== 'ALL' ? { tier } : undefined,
    orderBy: { totalSpent: 'desc' },
    take: 200,
  })
  return NextResponse.json(customers)
}
