export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { checkShopifyReadiness } from '@/lib/campaign-readiness'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const result = await checkShopifyReadiness(auth.organizationId)
  return NextResponse.json(result, { status: result.verified ? 200 : 409 })
}
