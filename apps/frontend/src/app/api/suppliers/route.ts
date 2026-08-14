export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const organization = await db.organization.findUnique({
    where: { id: auth.organizationId },
    select: { name: true, slug: true },
  })
  const isEkvaar = `${organization?.slug || ''} ${organization?.name || ''}`.toLowerCase().includes('ekvaar')
  if (isEkvaar) {
    const existing = await db.supplier.findFirst({ where: { organizationId: auth.organizationId, name: 'Qikink' } })
    if (!existing) {
      await db.supplier.create({
        data: {
          organizationId: auth.organizationId,
          name: 'Qikink',
          material: 'print-on-demand apparel and fulfillment',
          city: 'Coimbatore',
          leadTime: 7,
          rating: 4,
          status: 'ACTIVE',
        },
      })
    }
  }

  const suppliers = await db.supplier.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(suppliers)
}
