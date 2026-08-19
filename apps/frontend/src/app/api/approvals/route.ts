export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getMarketingApprovalReadiness } from '@/lib/marketing-approval'
import { logGovernanceAction, AuditAction } from '@/lib/audit-logger'
import { applyRateLimit } from '@/lib/rate-limiter'
import { captureApiError } from '@/lib/error-tracking'

export async function GET(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

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
      where: { organizationId: auth.organizationId },
      include: {
        requester: { select: { id: true, name: true, code: true, avatarColor: true, role: true } },
        campaignLaunch: { select: { id: true, code: true, status: true } },
        campaignRevision: { select: { id: true, revisionNum: true, versionHash: true, publishStatus: true, evidenceJson: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Log audit event for approvals access
    await logGovernanceAction({
      organizationId: auth.organizationId,
      action: AuditAction.APPROVAL_REQUESTED,
      actorName: auth.user?.name || 'System',
      actorRole: auth.user?.role,
      details: { action: 'VIEW_APPROVALS', count: approvals.length },
      request,
    })

    return NextResponse.json({ approvals: approvals.map((approval) => ({
      ...approval,
      marketingReadiness: approval.campaignRevision?.evidenceJson
        ? getMarketingApprovalReadiness(approval.campaignRevision.evidenceJson)
        : null,
    })) })
  } catch (error: any) {
    captureApiError(error, '/api/approvals', 'GET', {
      userId: auth.user.id,
      organizationId: auth.organizationId,
    })
    return NextResponse.json({ error: error.message || 'Failed to fetch approvals' }, { status: 500 })
  }
}
