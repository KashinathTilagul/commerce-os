export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getMarketingApprovalReadiness } from '@/lib/marketing-approval'
import { applyRateLimit } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const requestedStatus = request.nextUrl.searchParams.get('status')?.toUpperCase()
  const status = requestedStatus && ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(requestedStatus)
    ? requestedStatus
    : undefined

  // Apply rate limiting for approvals endpoint
  const rateLimitResult = await applyRateLimit(
    `${auth.organizationId}:${auth.user.id}`,
    'APPROVAL',
    request
  )
  
  if (!rateLimitResult.success && rateLimitResult.errorResponse) {
    const response = NextResponse.json(
      rateLimitResult.errorResponse.body,
      { status: rateLimitResult.errorResponse.status }
    )
    
    // Add rate limit headers
    Object.entries(rateLimitResult.errorResponse.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  try {
    const approvals = await db.approval.findMany({
      where: { organizationId: auth.organizationId, ...(status ? { status } : {}) },
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
    console.error('[Approvals GET]', { organizationId: auth.organizationId, error: error?.message || error })
    return NextResponse.json({ error: error.message || 'Failed to fetch approvals' }, { status: 500 })
  }
}
