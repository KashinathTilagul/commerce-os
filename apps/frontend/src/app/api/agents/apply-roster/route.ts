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

  const users = await db.user.findMany({ select: { id: true } })
  let created = 0, updated = 0

  for (const { id: userId } of users) {
    // Skip users with no agents at all (never onboarded) — nothing to attach to.
    const existingCount = await db.agent.count({ where: { userId } })
    if (existingCount === 0) continue

    // Upsert chiefs (enrich existing, keep runtime stats). Never touch isHuman.
    const codeToId: Record<string, string> = {}
    for (const c of chiefs) {
      const existing = await db.agent.findUnique({ where: { userId_code: { userId, code: c.code } } })
      if (existing) {
        if (existing.isHuman) { codeToId[c.code] = existing.id; continue }
        const u = await db.agent.update({
          where: { id: existing.id },
          data: { name: c.name, role: c.role, department: c.department, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor, managerId: null },
        })
        codeToId[c.code] = u.id; updated++
      } else {
        const n = await db.agent.create({
          data: { userId, code: c.code, name: c.name, role: c.role, department: c.department, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor, description: c.role, managerId: null },
        })
        codeToId[c.code] = n.id; created++
      }
    }

    // Upsert specialists with managerId resolved from managerCode.
    for (const s of specialists) {
      const managerId = s.managerCode ? codeToId[s.managerCode] ?? null : null
      const existing = await db.agent.findUnique({ where: { userId_code: { userId, code: s.code } } })
      if (existing) {
        await db.agent.update({
          where: { id: existing.id },
          data: { name: s.name, role: s.role, department: s.department, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, managerId },
        })
        updated++
      } else {
        await db.agent.create({
          data: { userId, code: s.code, name: s.name, role: s.role, department: s.department, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, description: s.role, managerId },
        })
        created++
      }
    }
  }

  return NextResponse.json({ ok: true, created, updated, roster: ROSTER.length })
}
