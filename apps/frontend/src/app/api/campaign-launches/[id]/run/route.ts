export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { campaignLaunchesEnabled } from '@/lib/campaign-feature'
import { getCampaignLaunch } from '@/lib/campaign-launches'
import { runCampaignLaunch } from '@/lib/campaign-runner'
import { db } from '@/lib/db'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!campaignLaunchesEnabled()) return NextResponse.json({ error: 'Campaign launches are not enabled' }, { status: 404 })
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const { id } = await params
  const launch = await getCampaignLaunch(auth.organizationId, id)
  if (!launch) return NextResponse.json({ error: 'Campaign launch not found' }, { status: 404 })
  if (['APPROVAL_PENDING', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'CANCELLED'].includes(launch.status)) {
    return NextResponse.json({ error: `Campaign cannot run from ${launch.status}` }, { status: 409 })
  }
  if (launch.status === 'BLOCKED') {
    const blockedItems = launch.items.filter((item) => ['BLOCKED', 'FAILED'].includes(item.status))
    await db.$transaction([
      db.campaignLaunch.update({ where: { id }, data: { status: 'EXECUTING', version: { increment: 1 } } }),
      ...blockedItems.map((item) => db.campaignLaunchItem.update({
        where: { id: item.id },
        data: { status: 'READY', leaseOwnerId: null, leaseExpiresAt: null },
      })),
      ...blockedItems.filter((item) => item.issueId).map((item) => db.issue.update({ where: { id: item.issueId! }, data: { status: 'BACKLOG' } })),
      db.campaignValidation.updateMany({ where: { launchId: id, status: { in: ['BLOCKED', 'FAIL'] } }, data: { status: 'PENDING', evidenceJson: undefined, completedAt: null } }),
    ])
  }
  void runCampaignLaunch(auth.organizationId, id).catch((error) => console.error('[CampaignRunner]', error))
  return NextResponse.json({ accepted: true, launchId: id }, { status: 202 })
}
