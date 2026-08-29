// Drive RUNNING campaign items to completion, mirroring the app's work-tick:
// call runAgentWork(org, assigneeId, issueId) until the item leaves RUNNING.
// Usage: node --import tsx --env-file=.env scripts/drive-running-items.ts <launchId> [launchId...]
import { db } from '../src/lib/db'
import { runAgentWork } from '../src/lib/agent-worker'

async function main() {
  const launchIds = process.argv.slice(2)
  if (launchIds.length === 0) throw new Error('usage: drive-running-items.ts <launchId>...')
  for (const launchId of launchIds) {
    const launch = await db.campaignLaunch.findUniqueOrThrow({ where: { id: launchId } })
    for (let round = 0; round < 6; round += 1) {
      const items = await db.campaignLaunchItem.findMany({
        where: { launchId, status: { in: ['READY', 'RUNNING'] }, assigneeId: { not: null }, issueId: { not: null } },
      })
      if (items.length === 0) break
      for (const item of items) {
        console.log(`round ${round}: driving ${item.code} (${item.status}, issue ${item.issueId})`)
        const r = await runAgentWork(launch.organizationId, item.assigneeId!, item.issueId!)
        console.log(`  → ok=${r.ok} status=${r.newStatus} ${r.message.slice(0, 140)}`)
      }
    }
    const after = await db.campaignLaunchItem.findMany({ where: { launchId }, orderBy: { code: 'asc' } })
    console.log(`${launch.code}: ${launch.status} | ${after.map((i) => `${i.code}:${i.status}`).join(' ')}`)
  }
  process.exit(0)
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
