import { db } from './db'
import { runAgentWork } from './agent-worker'
import { freezeCampaignRevision } from './campaign-evidence'

export async function runCampaignLaunch(organizationId: string, launchId: string) {
  await db.campaignLaunchItem.updateMany({
    where: { launchId, status: 'LEASED', leaseExpiresAt: { lt: new Date() } },
    data: { status: 'READY', leaseOwnerId: null, leaseExpiresAt: null },
  })
  await db.campaignValidation.updateMany({
    where: { launchId, status: 'RUNNING', startedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
    data: { status: 'PENDING', startedAt: null },
  })
  for (let cycle = 0; cycle < 20; cycle += 1) {
    const ready = await db.campaignLaunchItem.findMany({
      where: { launchId, launch: { organizationId }, code: { not: '14' }, status: 'READY', assigneeId: { not: null }, issueId: { not: null } },
      orderBy: { orderNum: 'asc' },
    })
    if (ready.length === 0) break
    const claimed: typeof ready = []
    for (const item of ready) {
      const result = await db.campaignLaunchItem.updateMany({
        where: { id: item.id, status: 'READY' },
        data: { status: 'LEASED', leaseOwnerId: item.assigneeId, leaseExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      })
      if (result.count === 1) claimed.push(item)
    }
    const results = await Promise.all(claimed.map(async (item) => ({
      item,
      result: await runAgentWork(organizationId, item.assigneeId!, item.issueId!),
    })))
    const failed = results.filter(({ result }) => !result.ok)
    if (failed.length > 0) {
      await db.$transaction([
        ...failed.map(({ item }) => db.campaignLaunchItem.update({ where: { id: item.id }, data: { status: 'FAILED', leaseOwnerId: null, leaseExpiresAt: null } })),
        db.campaignLaunch.update({ where: { id: launchId }, data: { status: 'BLOCKED', version: { increment: 1 } } }),
      ])
      return { status: 'BLOCKED' as const }
    }
    const blocked = await db.campaignLaunchItem.count({ where: { launchId, status: { in: ['BLOCKED', 'FAILED'] } } })
    if (blocked > 0) return { status: 'BLOCKED' as const }
  }

  const incomplete = await db.campaignLaunchItem.count({
    where: { launchId, code: { not: '14' }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
  })
  if (incomplete > 0) return { status: 'EXECUTING' as const }

  const validations = await db.campaignValidation.findMany({
    where: { launchId, status: { in: ['PENDING', 'BLOCKED', 'FAIL'] } },
    include: { validatorAgent: true, launch: true },
  })
  for (const validation of validations) {
    const claimed = await db.campaignValidation.updateMany({
      where: { id: validation.id, status: { in: ['PENDING', 'BLOCKED', 'FAIL'] } },
      data: { status: 'RUNNING', startedAt: new Date() },
    })
    if (claimed.count !== 1) continue
    const issueCode = `PAP-${validation.launch.code.slice(3)}-V-${validation.domain.slice(0, 3)}`
    const issue = await db.issue.upsert({
      where: { organizationId_code: { organizationId, code: issueCode } },
      update: { status: 'BACKLOG', assigneeId: validation.validatorAgentId },
      create: {
        organizationId,
        code: issueCode,
        title: `${validation.launch.code} · ${validation.domain.toLowerCase()} validation`,
        description: `Independently validate ${validation.launch.title}. Check the campaign employee outputs for ${validation.domain.toLowerCase()} risk and give evidence for a pass or blocker.`,
        status: 'BACKLOG',
        priority: validation.launch.priority,
        type: 'VALIDATION',
        department: validation.validatorAgent.department,
        assigneeId: validation.validatorAgentId,
      },
    })
    const result = await runAgentWork(organizationId, validation.validatorAgentId, issue.id)
    const passed = result.ok && result.newStatus !== 'BLOCKED'
    await db.campaignValidation.update({
      where: { id: validation.id },
      data: {
        status: passed ? 'PASS' : 'BLOCKED',
        evidenceJson: { issueId: issue.id, issueCode, result: result.message },
        completedAt: new Date(),
      },
    })
    if (!passed) {
      await db.campaignLaunch.update({ where: { id: launchId }, data: { status: 'BLOCKED', version: { increment: 1 } } })
      return { status: 'BLOCKED' as const }
    }
  }

  const validationOutstanding = await db.campaignValidation.count({ where: { launchId, status: { not: 'PASS' } } })
  if (validationOutstanding > 0) return { status: 'EXECUTING' as const }

  const packet = await db.campaignLaunchItem.findFirst({ where: { launchId, code: '14' } })
  if (!packet?.assigneeId || !packet.issueId) throw new Error('Founder packet assignment is incomplete')
  if (packet.status !== 'COMPLETED') {
    const claimed = await db.campaignLaunchItem.updateMany({ where: { id: packet.id, status: 'READY' }, data: { status: 'LEASED', leaseOwnerId: packet.assigneeId, leaseExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } })
    if (claimed.count !== 1) return { status: 'EXECUTING' as const }
    await db.issue.update({ where: { id: packet.issueId }, data: { status: 'BACKLOG' } })
    const result = await runAgentWork(organizationId, packet.assigneeId, packet.issueId)
    if (!result.ok || result.newStatus === 'BLOCKED') return { status: 'BLOCKED' as const }
  }

  const launch = await db.campaignLaunch.findFirstOrThrow({ where: { id: launchId, organizationId } })
  const krishna = await db.agent.findFirstOrThrow({ where: { organizationId, code: 'CEO' } })
  const revision = await freezeCampaignRevision(organizationId, launchId)
  await db.$transaction([
    db.campaignLaunch.update({ where: { id: launchId }, data: { status: 'APPROVAL_PENDING', version: { increment: 1 } } }),
    db.approval.upsert({
      where: { organizationId_code: { organizationId, code: `APR-${launch.code}` } },
      update: { status: 'PENDING', resolvedAt: null, revisionId: revision.id, proofHash: revision.versionHash, isRead: false },
      create: {
        organizationId,
        code: `APR-${launch.code}`,
        type: 'CAMPAIGN',
        title: `Approve ${launch.title}`,
        description: 'Krishna, assigned employees, and independent validators completed the campaign packet. Review before external publishing.',
        requesterId: krishna.id,
        launchId,
        revisionId: revision.id,
        itemCode: '14',
        proofHash: revision.versionHash,
      },
    }),
  ])
  return { status: 'APPROVAL_PENDING' as const }
}
