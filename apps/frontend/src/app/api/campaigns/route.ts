import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization, requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const campaigns = await db.campaign.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { startDate: 'desc' },
  })
  return NextResponse.json(campaigns)
}
