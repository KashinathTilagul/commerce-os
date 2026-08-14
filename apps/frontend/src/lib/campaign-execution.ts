import { db } from './db'
import { createHash } from 'node:crypto'

function commerceDraft(launchCode: string, brief: string) {
  const percentage = Math.min(Number(brief.match(/\b(\d{1,2})\s*%/)?.[1] ?? 10), 50)
  const draft = {
    provider: 'shopify',
    action: 'CREATE_DISCOUNT_DRAFT',
    code: `EKVAAR-${launchCode.replace(/[^A-Z0-9]/g, '')}`,
    percentage,
    target: 'CAMPAIGN_PRODUCTS',
    requiresFounderApproval: true,
  }
  return { draft, hash: createHash('sha256').update(JSON.stringify(draft)).digest('hex') }
}

export async function syncCampaignItemAfterWork(organizationId: string, issueId: string, issueStatus: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.campaignLaunchItem.findFirst({
      where: { issueId, launch: { organizationId } },
      include: { launch: true },
    })
    if (!item) return null

    if (issueStatus === 'BLOCKED') {
      await tx.campaignLaunchItem.update({ where: { id: item.id }, data: { status: 'BLOCKED', leaseOwnerId: null, leaseExpiresAt: null } })
      await tx.campaignLaunch.update({ where: { id: item.launchId }, data: { status: 'BLOCKED', version: { increment: 1 } } })
      return item.launchId
    }
    if (!['DONE', 'IN_REVIEW'].includes(issueStatus)) {
      await tx.campaignLaunchItem.update({ where: { id: item.id }, data: { status: 'RUNNING', leaseOwnerId: null, leaseExpiresAt: null } })
      return item.launchId
    }

    await tx.campaignLaunchItem.update({
      where: { id: item.id },
      data: { status: 'COMPLETED', completedAt: new Date(), leaseOwnerId: null, leaseExpiresAt: null },
    })

    let advanced = true
    while (advanced) {
      advanced = false
      const waiting = await tx.campaignLaunchItem.findMany({
        where: { launchId: item.launchId, status: { in: ['PENDING', 'READY'] } },
        include: { dependencies: { include: { dependsOn: true } } },
      })
      for (const candidate of waiting) {
        if (!candidate.dependencies.every((dependency) => dependency.dependsOn.status === 'COMPLETED')) continue
        if (candidate.assigneeType === 'SYSTEM') {
          const commerce = commerceDraft(item.launch.code, item.launch.brief)
          await tx.campaignLaunchItem.update({
            where: { id: candidate.id },
            data: { status: 'COMPLETED', completedAt: new Date(), providerDraft: commerce.draft, evidenceHash: commerce.hash },
          })
          advanced = true
        } else if (candidate.status === 'PENDING') {
          await tx.campaignLaunchItem.update({ where: { id: candidate.id }, data: { status: 'READY' } })
          if (candidate.issueId) await tx.issue.update({ where: { id: candidate.issueId }, data: { status: 'BACKLOG' } })
        }
      }
    }

    return item.launchId
  })
}
