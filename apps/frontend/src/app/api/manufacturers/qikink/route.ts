export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { listQikinkOrders, qikinkConfig, summarizeQikinkOrders } from '@/lib/manufacturers/qikink'

async function requireEkvaarOrganization(organizationId: string) {
  const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true, slug: true } })
  const marker = `${organization?.slug || ''} ${organization?.name || ''}`.toLowerCase()
  return marker.includes('ekvaar')
}

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  if (!(await requireEkvaarOrganization(auth.organizationId))) {
    return NextResponse.json({ error: 'Qikink monitoring is only enabled for the EKVAAR organization.' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const result = await listQikinkOrders({
    id: searchParams.get('id') || undefined,
    fromDate: searchParams.get('from_date') || undefined,
    toDate: searchParams.get('to_date') || undefined,
  })

  if (!result.ok) {
    return NextResponse.json({
      configured: Boolean(qikinkConfig().clientId && qikinkConfig().clientSecret),
      supplier: 'Qikink',
      error: result.error,
    }, { status: 503 })
  }

  return NextResponse.json({
    configured: true,
    supplier: 'Qikink',
    mode: result.mode,
    summary: summarizeQikinkOrders(result.data),
    raw: result.data,
  })
}
