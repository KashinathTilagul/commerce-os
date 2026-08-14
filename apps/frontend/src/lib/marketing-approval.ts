import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { db } from './db'
import { nextCampaignLaunchCode } from './campaign-launch-code'
import { hashCampaignEvidence } from './campaign-evidence-hash'

type MarketingResult = {
  accepted?: boolean
  executionId?: string
  generatedAt?: string
  plan?: { content_cycle?: { cycle_name?: string }; cycle_name?: string; calendar?: unknown[]; [key: string]: unknown }
}

export function getMarketingApprovalReadiness(evidence: any) {
  const plan = evidence?.plan || evidence
  const calendar = Array.isArray(plan?.calendar) ? plan.calendar : []
  const expected = Number(plan?.publishing_summary?.total_items ?? plan?.content_cycle?.total_posts ?? calendar.length)
  const countOk = calendar.length > 0 && calendar.length === expected
  const mediaMissing = calendar.filter((entry: any) => entry?.format !== 'text_only' && !entry?.media_url && !entry?.asset_url && !entry?.image_url && !entry?.video_url && !entry?.preview_url)
  const rightsMissing = calendar.filter((entry: any) => !entry?.rights_check || !/^PASS\b/i.test(String(entry.rights_check)))
  const policyMissing = calendar.filter((entry: any) => !entry?.policy_check || !/^PASS\b/i.test(String(entry.policy_check)))
  const ready = countOk && mediaMissing.length === 0 && rightsMissing.length === 0 && policyMissing.length === 0
  return { ready, countOk, expected, actual: calendar.length, mediaMissing: mediaMissing.length, rightsMissing: rightsMissing.length, policyMissing: policyMissing.length }
}

export async function createMarketingFounderApproval(input: {
  organizationId: string
  requesterId?: string
  workflowId: string
  instruction: string
  result: MarketingResult
}) {
  const plan = input.result?.plan
  const calendar = Array.isArray(plan?.calendar) ? plan.calendar : []
  if (!plan || calendar.length === 0) throw new Error('n8n returned no marketing calendar for Founder review')

  return db.$transaction(async (tx) => {
    const requester = input.requesterId
      ? await tx.agent.findFirst({ where: { id: input.requesterId, organizationId: input.organizationId } })
      : await tx.agent.findFirst({ where: { organizationId: input.organizationId, department: 'MARKETING', isHuman: false }, orderBy: { createdAt: 'asc' } })
        || await tx.agent.findFirst({ where: { organizationId: input.organizationId, code: 'CEO' } })
    if (!requester) throw new Error('No Marketing or CEO agent is available to request Founder approval')

    const existing = await tx.campaignLaunch.findMany({ where: { organizationId: input.organizationId }, select: { code: true } })
    const code = nextCampaignLaunchCode(existing.map((launch) => launch.code))
    const title = plan.content_cycle?.cycle_name || plan.cycle_name || 'Ekvaar marketing content cycle'
    const launch = await tx.campaignLaunch.create({
      data: {
        organizationId: input.organizationId,
        code,
        title,
        brief: input.instruction,
        status: 'APPROVAL_PENDING',
        startedAt: new Date(),
        items: {
          create: calendar.map((entry, index) => ({
            code: String(index + 1).padStart(2, '0'),
            type: 'SOCIAL_CONTENT',
            title: `${(entry as any)?.platform || 'Social'} · ${(entry as any)?.format || 'post'}`,
            description: (entry as any)?.caption || (entry as any)?.asset_brief || 'Generated marketing content',
            status: 'COMPLETED',
            orderNum: index + 1,
            assigneeType: 'AGENT',
            assigneeId: requester.id,
            providerDraft: entry as Prisma.InputJsonValue,
            executionKey: `n8n-marketing-${randomUUID()}`,
            completedAt: new Date(),
          })),
        },
      },
    })
    const evidence = {
      source: 'N8N_EKVAAR_MARKETING',
      workflowId: input.workflowId,
      executionId: input.result.executionId || null,
      generatedAt: input.result.generatedAt || new Date().toISOString(),
      plan,
    }
    const versionHash = hashCampaignEvidence(evidence)
    const revision = await tx.campaignRevision.create({
      data: {
        launchId: launch.id,
        revisionNum: 1,
        versionHash,
        evidenceJson: evidence as Prisma.InputJsonValue,
        approvalMode: 'FOUNDER',
      },
    })
    const approval = await tx.approval.create({
      data: {
        organizationId: input.organizationId,
        code: `APR-${code}`,
        type: 'CAMPAIGN',
        title: `Approve ${title}`,
        description: `${calendar.length} generated social items are ready for media review, scheduling and publishing approval.`,
        requesterId: requester.id,
        launchId: launch.id,
        revisionId: revision.id,
        proofHash: versionHash,
        inbox: 'UNREAD',
      },
    })
    return { launchId: launch.id, revisionId: revision.id, approvalId: approval.id, approvalCode: approval.code }
  })
}
