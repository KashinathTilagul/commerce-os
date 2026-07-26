import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const restorations = await db.restoration.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { requestedAt: 'desc' },
  })
  return NextResponse.json(restorations)
}
