export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const transactions = await db.transaction.findMany({
    where: { organizationId: auth.organizationId, ...(type && type !== 'ALL' ? { type } : {}) },
    orderBy: { date: 'desc' },
    take: 300,
  })
  return NextResponse.json(transactions)
}
