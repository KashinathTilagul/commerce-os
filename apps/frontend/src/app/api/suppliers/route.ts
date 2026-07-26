import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const suppliers = await db.supplier.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(suppliers)
}
