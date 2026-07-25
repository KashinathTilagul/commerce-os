import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const campaigns = await db.campaign.findMany({
    where: { organizationId: auth.organization.id },
    orderBy: { startDate: 'desc' },
  })
  return NextResponse.json(campaigns)
}
