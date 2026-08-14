export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'
import { hashCampaignEvidence } from '@/lib/campaign-evidence'
import { getMarketingApprovalReadiness } from '@/lib/marketing-approval'

const ResolutionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  note: z.string().trim().max(2000).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params

  try {
    const parsed = ResolutionSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid resolution' }, { status: 400 })
    const { status, note } = parsed.data

    const approval = await db.approval.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { requester: true, campaignLaunch: true, campaignRevision: true },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    if (approval.status !== 'PENDING') return NextResponse.json({ error: 'Approval is already resolved' }, { status: 409 })
    if (approval.campaignRevision && approval.type === 'CAMPAIGN' && status === 'APPROVED') {
      const readiness = getMarketingApprovalReadiness(approval.campaignRevision.evidenceJson)
      if (!readiness.ready) {
        return NextResponse.json({ error: 'Campaign is not publish-ready', readiness }, { status: 409 })
      }
    }
    if (approval.campaignRevision && status === 'APPROVED') {
      if (approval.proofHash !== approval.campaignRevision.versionHash || hashCampaignEvidence(approval.campaignRevision.evidenceJson) !== approval.campaignRevision.versionHash) {
        return NextResponse.json({ error: 'Campaign evidence changed; create a new revision before approval' }, { status: 409 })
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.approval.update({
        where: { id },
        data: { status, resolvedAt: new Date(), isRead: true, policyDecision: note ? { founderNote: note } : undefined },
      })
      if (approval.campaignLaunch && approval.campaignRevision) {
        if (status === 'APPROVED') {
          await tx.campaignRevision.update({
            where: { id: approval.campaignRevision.id },
            data: { status: 'APPROVED', publishStatus: 'READY', approvalMode: 'FOUNDER', approvedByUserId: auth.user.id, approvedAt: new Date() },
          })
          await tx.campaignLaunch.update({ where: { id: approval.campaignLaunch.id }, data: { status: 'APPROVED', version: { increment: 1 } } })
        } else {
          await tx.campaignRevision.update({
            where: { id: approval.campaignRevision.id },
            data: { status: 'REJECTED', publishStatus: 'INELIGIBLE' },
          })
          await tx.campaignLaunch.update({
            where: { id: approval.campaignLaunch.id },
            data: { status: status === 'REVISION_REQUESTED' ? 'EXECUTING' : 'REVIEW', version: { increment: 1 } },
          })
          if (status === 'REVISION_REQUESTED') {
            const packet = await tx.campaignLaunchItem.findFirst({ where: { launchId: approval.campaignLaunch.id, code: '14' } })
            if (packet) {
              await tx.campaignLaunchItem.update({ where: { id: packet.id }, data: { status: 'READY', completedAt: null } })
              if (packet.issueId) {
                await tx.issue.update({ where: { id: packet.issueId }, data: { status: 'BACKLOG' } })
                if (note) await tx.issueComment.create({ data: { issueId: packet.issueId, authorName: 'Founder', body: note, kind: 'COMMENT' } })
              }
            }
          }
        }
      }
      return result
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: `APPROVAL_${status}`,
        actorName: 'Founder',
        summary: `Founder ${status.toLowerCase()} approval ${approval.code}: ${approval.title}`,
        payload: JSON.stringify({ approvalCode: approval.code, resolution: status, launchId: approval.launchId, revisionId: approval.revisionId }),
      },
    })

    if (status === 'APPROVED' && approval.campaignRevision) {
      const { publishDueMarketing } = await import('@/lib/social-publisher')
      void publishDueMarketing(auth.organizationId).catch((error) => console.error('[SocialPublisher]', error))
    }

    return NextResponse.json({ approval: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 })
  }
}
