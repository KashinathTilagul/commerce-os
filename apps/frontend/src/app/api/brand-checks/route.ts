import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const checks = await db.brandCheck.findMany({
    where: { organizationId: auth.user.id },
    orderBy: { checkedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(checks)
}
