import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Called by Render cron or any scheduler. Protect with CRON_SECRET env var.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fortyEightHrsAgo = new Date(Date.now() - 48 * 3600 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)

  // ── 1. Fulfillment Watchdog ──────────────────────────────────────────────
  // Find orders stuck in PROCESSING for >48hrs and create an Issue if one doesn't exist yet
  const stuckOrders = await db.order.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: fortyEightHrsAgo } },
    select: { id: true, userId: true, orderNumber: true, customerName: true, total: true, updatedAt: true },
  })

  let issuesCreated = 0
  for (const order of stuckOrders) {
    const alreadyFlagged = await db.issue.findFirst({
      where: { userId: order.userId, title: { contains: order.orderNumber } },
    })
    if (alreadyFlagged) continue

    const hoursStuck = Math.round((Date.now() - order.updatedAt.getTime()) / 3600000)
    await db.issue.create({
      data: {
        userId: order.userId,
        code: `PAP-${Date.now().toString().slice(-6)}`,
        title: `Order ${order.orderNumber} stuck in processing for ${hoursStuck}h`,
        description: `Customer: ${order.customerName}. Order value: ₹${order.total.toLocaleString('en-IN')}. Last updated ${order.updatedAt.toLocaleDateString('en-IN')}.`,
        priority: hoursStuck > 72 ? 'P0' : 'P1',
        type: 'TASK',
        department: 'OPERATIONS',
        status: 'BACKLOG',
      },
    })
    issuesCreated++
  }

  // ── 2. Blocker Radar ─────────────────────────────────────────────────────
  // Find issues that have been BLOCKED for >7 days with no update and log an Event
  const stalledBlockers = await db.issue.findMany({
    where: { status: 'BLOCKED', updatedAt: { lt: sevenDaysAgo } },
    select: { id: true, userId: true, code: true, title: true, priority: true },
  })

  // Group by user
  const blockersByUser = stalledBlockers.reduce<Record<string, typeof stalledBlockers>>((acc, i) => {
    ;(acc[i.userId] ??= []).push(i)
    return acc
  }, {})

  for (const [userId, blockers] of Object.entries(blockersByUser)) {
    await db.event.create({
      data: {
        userId,
        type: 'BLOCKER_RADAR',
        actorName: 'Watchdog',
        summary: `${blockers.length} issue${blockers.length > 1 ? 's' : ''} stalled as BLOCKED for 7+ days`,
        payload: JSON.stringify({ codes: blockers.map(b => b.code) }),
        severity: 'WARN',
      },
    })
  }

  // ── 3. Agent Work Cycle ──────────────────────────────────────────────────
  // Advance one open ticket for each agent that has assigned work, so tickets
  // keep progressing on their own between founder assignments.
  // Include IN_REVIEW so a founder push-back comment re-engages the agent
  // (runAgentWork itself decides whether an IN_REVIEW ticket is actionable).
  const busyAgents = await db.agent.findMany({
    where: { isHuman: false, issuesAssigned: { some: { status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW'] } } } },
    select: { id: true, userId: true },
    take: 25, // bound per run
  })
  let agentsWorked = 0
  const { runAgentWork } = await import('@/lib/agent-worker')
  for (const a of busyAgents) {
    try {
      const r = await runAgentWork(a.userId, a.id)
      if (r.ok && r.issueCode) agentsWorked++
    } catch { /* keep going */ }
  }

  return NextResponse.json({
    ok: true,
    stuckOrders: stuckOrders.length,
    issuesCreated,
    stalledBlockers: stalledBlockers.length,
    agentsWorked,
  })
}
