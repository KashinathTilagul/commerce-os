import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const suppliers = await db.supplier.findMany({
    where: { organizationId: auth.user.id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(suppliers)
}
