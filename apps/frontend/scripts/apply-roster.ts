// Idempotent: upsert every digital employee into every organization.
// The authenticated Founder is a User and is not added to the digital roster.
//
// Usage (local): npx tsx scripts/apply-roster.ts
// Usage (prod):  run via the apply-roster.yml GitHub Action

import { db } from '../src/lib/db'
import { syncAgentRoster } from '../src/lib/agent-roster-sync'

async function main() {
  const organizations = await db.organization.findMany({ orderBy: { createdAt: 'asc' } })
  if (organizations.length === 0) throw new Error('No organization found — sign up first, then run this script.')

  for (const organization of organizations) {
    const applied = await syncAgentRoster(db, organization.id)
    const total = await db.agent.count({ where: { organizationId: organization.id } })
    console.log(`[✓] ${applied} digital employees applied; ${total} total agents for ${organization.name}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect?.())
