// Idempotent: upsert every agent from agent-roster.ts into the DB.
// Chiefs first (so their ids exist), then specialists linked via managerId.
// Skips the human FOUNDER row. Safe to re-run — uses upsert by `code`.
//
// Usage (local): npx tsx scripts/apply-roster.ts
// Usage (prod):  run via deploy workflow after `prisma migrate deploy`

import { db } from '../src/lib/db'
import { ROSTER } from '../src/lib/agent-roster'

async function main() {
  // Find the first non-founder user to own the agents (multi-tenant: one owner)
  const user = await db.user.findFirst({ where: { NOT: { email: '' } }, orderBy: { createdAt: 'asc' } })
  if (!user) throw new Error('No user found — sign up first, then run this script.')
  const userId = user.id

  // Phase 1: upsert Chiefs (managerCode === null)
  const codeToId: Record<string, string> = {}
  const chiefs = ROSTER.filter(a => a.managerCode === null)
  for (const c of chiefs) {
    const agent = await db.agent.upsert({
      where: { userId_code: { userId, code: c.code } },
      create: { userId, code: c.code, name: c.name, role: c.role, department: c.department, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor, description: c.role, managerId: null, tokenBudget: 50000 },
      update: { name: c.name, role: c.role, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor },
    })
    codeToId[c.code] = agent.id
  }
  console.log(`[✓] ${chiefs.length} chiefs upserted`)

  // Phase 2: upsert specialists
  const specialists = ROSTER.filter(a => a.managerCode !== null)
  for (const s of specialists) {
    const managerId = s.managerCode ? (codeToId[s.managerCode] ?? null) : null
    await db.agent.upsert({
      where: { userId_code: { userId, code: s.code } },
      create: { userId, code: s.code, name: s.name, role: s.role, department: s.department, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, description: s.role, managerId, tokenBudget: 50000 },
      update: { name: s.name, role: s.role, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, managerId },
    })
  }
  console.log(`[✓] ${specialists.length} specialists upserted`)

  const total = await db.agent.count({ where: { userId } })
  console.log(`[✓] org total: ${total} agents for ${user.email}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect?.())
