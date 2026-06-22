import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const transactions = await db.transaction.findMany({
    where: type && type !== 'ALL' ? { type } : undefined,
    orderBy: { date: 'desc' },
    take: 300,
  })
  return NextResponse.json(transactions)
}
