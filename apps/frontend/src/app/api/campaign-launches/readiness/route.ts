export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { getCampaignProviderReadiness } from '@/lib/campaign-readiness'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  return NextResponse.json(await getCampaignProviderReadiness(auth.organizationId))
}
