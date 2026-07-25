import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROSTER } from '@/lib/agent-roster'

// Idempotently build the digital-employees org (Chiefs + specialists, with
// hierarchy) for every user. Guarded by CRON_SECRET like /api/cron/watchdog;
// triggered once from the box after a deploy. Safe to re-run.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Chiefs first (managerCode null), then specialists — so a chief's id exists
  // before its reports resolve managerId.
  const chiefs = ROSTER.filter(a => a.managerCode === null)
  const specialists = ROSTER.filter(a => a.managerCode !== null)

  const users = await db.user.findMany({ select: { organizationId: true }, where: { organizationId: { not: null } } })
  let count = 0

  for (const { organizationId } of users) {
    // Skip users with no agents at all (never onboarded) — nothing to attach to.
    if ((await db.agent.count({ where: { organizationId: String(organizationId) } })) === 0) continue

    // Chiefs first so their ids exist before specialists resolve managerId.
    const codeToId: Record<string, string> = {}
    for (const c of chiefs) {
      const fields = { name: c.name, role: c.role, department: c.department, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor, managerId: null }
      const a = await db.agent.upsert({
        where: { organizationId_code: { organizationId: String(organizationId), code: c.code } },
        update: fields,
        create: { organizationId: String(organizationId), code: c.code, description: c.role, ...fields },
      })
      codeToId[c.code] = a.id; count++
    }
    for (const s of specialists) {
      const managerId = s.managerCode ? codeToId[s.managerCode] ?? null : null
      const fields = { name: s.name, role: s.role, department: s.department, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, managerId }
      await db.agent.upsert({
        where: { organizationId_code: { organizationId: (organizationId as string), code: s.code } },
        update: fields,
        create: { organizationId: (organizationId as string), code: s.code, description: s.role, ...fields },
      })
      count++
    }
  }

  return NextResponse.json({ ok: true, applied: count, roster: ROSTER.length })
}
