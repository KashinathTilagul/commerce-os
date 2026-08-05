export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const checks = await db.brandCheck.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { checkedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(checks)
}
