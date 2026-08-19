export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import { campaignLaunchesEnabled } from '@/lib/campaign-feature'
import { createCampaignLaunch, listCampaignLaunches } from '@/lib/campaign-launches'
import { runCampaignLaunch } from '@/lib/campaign-runner'
import { planWorkRequest } from '@/lib/work-request-planner'

const CreateCampaignSchema = z.object({
  title: z.string().trim().min(3).max(160),
  brief: z.string().trim().min(10).max(8000),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  budgetCap: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).nullable().optional(),
})

function disabled() {
  return NextResponse.json({ error: 'Campaign launches are not enabled' }, { status: 404 })
}

export async function GET(req: NextRequest) {
  if (!campaignLaunchesEnabled()) return disabled()
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  // Hidden (silent-research) launches only surface on explicit request.
  const includeHidden = req.nextUrl.searchParams.get('includeHidden') === 'true'
  return NextResponse.json(await listCampaignLaunches(auth.organizationId, { includeHidden }))
}

export async function POST(req: NextRequest) {
  if (!campaignLaunchesEnabled()) return disabled()
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const parsed = CreateCampaignSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid campaign launch' }, { status: 400 })
    }
    const plan = planWorkRequest(parsed.data.brief)
    const launch = await createCampaignLaunch({ organizationId: auth.organizationId, ...parsed.data, hidden: plan.hidden, items: plan.items, validations: plan.validations })
    void runCampaignLaunch(auth.organizationId, launch.id).catch((error) => console.error('[CampaignRunner]', error))
    return NextResponse.json({ ...launch, plan: { kind: plan.kind, label: plan.label, hidden: plan.hidden, itemCount: plan.items.length } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create campaign launch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
