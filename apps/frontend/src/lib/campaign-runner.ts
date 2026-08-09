import { db } from './db'
import { runAgentWork } from './agent-worker'

export async function runCampaignLaunch(organizationId: string, launchId: string) {
  for (let cycle = 0; cycle < 20; cycle += 1) {
    const ready = await db.campaignLaunchItem.findMany({
      where: { launchId, launch: { organizationId }, status: 'READY', assigneeId: { not: null }, issueId: { not: null } },
      orderBy: { orderNum: 'asc' },
    })
    if (ready.length === 0) break
    await Promise.all(ready.map((item) => runAgentWork(organizationId, item.assigneeId!, item.issueId!)))
    const blocked = await db.campaignLaunchItem.count({ where: { launchId, status: { in: ['BLOCKED', 'FAILED'] } } })
    if (blocked > 0) return { status: 'BLOCKED' as const }
  }

  const incomplete = await db.campaignLaunchItem.count({
    where: { launchId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
  })
  if (incomplete > 0) return { status: 'EXECUTING' as const }

  const validations = await db.campaignValidation.findMany({
    where: { launchId, status: { in: ['PENDING', 'BLOCKED', 'FAIL'] } },
    include: { validatorAgent: true, launch: true },
  })
  for (const validation of validations) {
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
    await db.campaignValidation.update({ where: { id: validation.id }, data: { status: 'RUNNING', startedAt: new Date() } })
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

  const launch = await db.campaignLaunch.findFirstOrThrow({ where: { id: launchId, organizationId } })
  const krishna = await db.agent.findFirstOrThrow({ where: { organizationId, code: 'CEO' } })
  await db.$transaction([
    db.campaignLaunch.update({ where: { id: launchId }, data: { status: 'APPROVAL_PENDING', version: { increment: 1 } } }),
    db.approval.upsert({
      where: { organizationId_code: { organizationId, code: `APR-${launch.code}` } },
      update: {},
      create: {
        organizationId,
        code: `APR-${launch.code}`,
        type: 'CAMPAIGN',
        title: `Approve ${launch.title}`,
        description: 'Krishna, assigned employees, and independent validators completed the campaign packet. Review before external publishing.',
        requesterId: krishna.id,
        launchId,
        itemCode: '14',
      },
    }),
  ])
  return { status: 'APPROVAL_PENDING' as const }
}
