// Retry a BLOCKED launch the same way POST /api/campaign-launches/[id]/run does.
// Usage: node --import tsx --env-file=.env scripts/retry-blocked-launch.ts <launchId>
import { db } from '../src/lib/db'
import { runCampaignLaunch } from '../src/lib/campaign-runner'

async function main() {
  const launchId = process.argv[2]
  if (!launchId) throw new Error('usage: retry-blocked-launch.ts <launchId>')
  const launch = await db.campaignLaunch.findUnique({ where: { id: launchId }, include: { items: true } })
  if (!launch) throw new Error(`launch ${launchId} not found`)
  console.log(`retrying ${launch.code} (status ${launch.status}, org ${launch.organizationId})`)

  if (launch.status === 'BLOCKED') {
    const blockedItems = launch.items.filter((item) => ['BLOCKED', 'FAILED'].includes(item.status))
    await db.$transaction([
      db.campaignLaunch.update({ where: { id: launchId }, data: { status: 'EXECUTING', version: { increment: 1 } } }),
      ...blockedItems.map((item) => db.campaignLaunchItem.update({
        where: { id: item.id },
        data: { status: 'READY', leaseOwnerId: null, leaseExpiresAt: null },
      })),
      ...blockedItems.filter((item) => item.issueId).map((item) => db.issue.update({ where: { id: item.issueId! }, data: { status: 'BACKLOG' } })),
      db.campaignValidation.updateMany({ where: { launchId, status: { in: ['BLOCKED', 'FAIL'] } }, data: { status: 'PENDING', evidenceJson: undefined, completedAt: null } }),
    ])
    console.log(`reset ${blockedItems.length} blocked/failed item(s) to READY`)
  }

  const result = await runCampaignLaunch(launch.organizationId, launchId)
  console.log('runCampaignLaunch →', result)

  const after = await db.campaignLaunchItem.findMany({ where: { launchId }, orderBy: { code: 'asc' } })
  for (const item of after) console.log(`  item ${item.code} ${item.type}: ${item.status}`)
  const runs = await db.agentRun.findMany({
    where: { campaignItemId: { in: after.map((i) => i.id) } },
    orderBy: { startedAt: 'desc' }, take: 3,
    include: { steps: { orderBy: { sequence: 'asc' } } },
  })
  for (const run of runs) {
    console.log(`  run ${run.id} ${run.status}: ${(run.error || run.outputSummary || '').slice(0, 200)}`)
    for (const step of run.steps.filter((s) => s.status === 'FAILED' || s.error)) {
      console.log(`    step ${step.sequence} ${step.type} ${step.toolName || ''}: ${(step.error || '').slice(0, 300)}`)
    }
  }
  const artifacts = await db.artifact.findMany({ where: { organizationId: launch.organizationId }, orderBy: { createdAt: 'desc' }, take: 3 })
  for (const a of artifacts) console.log(`  artifact ${a.id} ${a.mimeType} ${a.byteSize}B status=${a.status}`)
  process.exit(0)
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
