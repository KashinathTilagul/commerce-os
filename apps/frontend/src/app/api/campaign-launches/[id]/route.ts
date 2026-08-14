export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import { campaignLaunchesEnabled } from '@/lib/campaign-feature'
import { getCampaignLaunch, updateCampaignLaunch } from '@/lib/campaign-launches'

const UpdateCampaignSchema = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(3).max(160).optional(),
  brief: z.string().trim().min(10).max(8000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  budgetCap: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).nullable().optional(),
  status: z.enum([
    'DRAFT', 'PLANNING', 'EXECUTING', 'REVIEW', 'APPROVAL_PENDING', 'BLOCKED', 'CANCELLED',
  ]).optional(),
}).refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), 'No campaign changes supplied')

function disabled() {
  return NextResponse.json({ error: 'Campaign launches are not enabled' }, { status: 404 })
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!campaignLaunchesEnabled()) return disabled()
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const launch = await getCampaignLaunch(auth.organizationId, id)
  return launch
    ? NextResponse.json(launch)
    : NextResponse.json({ error: 'Campaign launch not found' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!campaignLaunchesEnabled()) return disabled()
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = UpdateCampaignSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid campaign update' }, { status: 400 })
  }

  try {
    const { id } = await params
    const launch = await updateCampaignLaunch({ organizationId: auth.organizationId, id, ...parsed.data })
    return NextResponse.json(launch)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update campaign launch'
    const status = message.includes('not found') ? 404 : message.includes('reload') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!campaignLaunchesEnabled()) return disabled()
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = z.object({ expectedVersion: z.number().int().positive() }).safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'expectedVersion is required' }, { status: 400 })

  try {
    const { id } = await context.params
    const launch = await updateCampaignLaunch({
      organizationId: auth.organizationId,
      id,
      expectedVersion: parsed.data.expectedVersion,
      status: 'CANCELLED',
    })
    return NextResponse.json(launch)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not cancel campaign launch'
    const status = message.includes('not found') ? 404 : message.includes('reload') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
