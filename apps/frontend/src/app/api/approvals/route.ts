export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getMarketingApprovalReadiness } from '@/lib/marketing-approval'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const approvals = await db.approval.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        requester: { select: { id: true, name: true, code: true, avatarColor: true, role: true } },
        campaignLaunch: { select: { id: true, code: true, status: true } },
        campaignRevision: { select: { id: true, revisionNum: true, versionHash: true, publishStatus: true, evidenceJson: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ approvals: approvals.map((approval) => ({
      ...approval,
      marketingReadiness: approval.campaignRevision?.evidenceJson
        ? getMarketingApprovalReadiness(approval.campaignRevision.evidenceJson)
        : null,
    })) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch approvals' }, { status: 500 })
  }
}
