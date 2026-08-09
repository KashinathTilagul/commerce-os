import { db } from './db'

export async function syncCampaignItemAfterWork(organizationId: string, issueId: string, issueStatus: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.campaignLaunchItem.findFirst({
      where: { issueId, launch: { organizationId } },
      include: { launch: true },
    })
    if (!item) return null

    if (issueStatus === 'BLOCKED') {
      await tx.campaignLaunchItem.update({ where: { id: item.id }, data: { status: 'BLOCKED' } })
      await tx.campaignLaunch.update({ where: { id: item.launchId }, data: { status: 'BLOCKED', version: { increment: 1 } } })
      return item.launchId
    }
    if (!['DONE', 'IN_REVIEW'].includes(issueStatus)) {
      await tx.campaignLaunchItem.update({ where: { id: item.id }, data: { status: 'RUNNING' } })
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
          await tx.campaignLaunchItem.update({ where: { id: candidate.id }, data: { status: 'COMPLETED', completedAt: new Date() } })
          advanced = true
        } else if (candidate.status === 'PENDING') {
          await tx.campaignLaunchItem.update({ where: { id: candidate.id }, data: { status: 'READY' } })
          if (candidate.issueId) await tx.issue.update({ where: { id: candidate.issueId }, data: { status: 'BACKLOG' } })
        }
      }
    }

    const remaining = await tx.campaignLaunchItem.count({
      where: { launchId: item.launchId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    })
    if (remaining === 0) {
      const krishna = await tx.agent.findFirst({ where: { organizationId, code: 'CEO' } })
      if (!krishna) throw new Error('Krishna is missing from the workforce roster')
      await tx.campaignLaunch.update({
        where: { id: item.launchId },
        data: { status: 'APPROVAL_PENDING', version: { increment: 1 } },
      })
      await tx.approval.upsert({
        where: { organizationId_code: { organizationId, code: `APR-${item.launch.code}` } },
        update: {},
        create: {
          organizationId,
          code: `APR-${item.launch.code}`,
          type: 'CAMPAIGN',
          title: `Approve ${item.launch.title}`,
          description: 'Krishna and the assigned employees completed the campaign packet. Review before any external publishing.',
          requesterId: krishna.id,
          launchId: item.launchId,
          itemCode: '14',
        },
      })
    }
    return item.launchId
  })
}
