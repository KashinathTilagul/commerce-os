export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isCronAuthorized } from '@/lib/cron-auth'

// Called by Render cron or any scheduler. Protect with CRON_SECRET env var.
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fortyEightHrsAgo = new Date(Date.now() - 48 * 3600 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)

  // ── 1. Fulfillment Watchdog ──────────────────────────────────────────────
  // Find orders stuck in PROCESSING for >48hrs and create an Issue if one doesn't exist yet
  const stuckOrders = await db.order.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: fortyEightHrsAgo } },
    select: { id: true, organizationId: true, orderNumber: true, customerName: true, total: true, updatedAt: true },
  })

  let issuesCreated = 0
  for (const order of stuckOrders) {
    const alreadyFlagged = await db.issue.findFirst({
      where: { organizationId: order.organizationId, title: { contains: order.orderNumber } },
    })
    if (alreadyFlagged) continue

    const hoursStuck = Math.round((Date.now() - order.updatedAt.getTime()) / 3600000)
    // Assign to an OPERATIONS agent so runAgentWork actually picks it up
    // (it only selects issues where assigneeId matches the agent).
    const opsAgent = await db.agent.findFirst({
      where: { organizationId: order.organizationId, isHuman: false, department: 'OPERATIONS' },
      select: { id: true },
    })
    await db.issue.create({
      data: {
        organizationId: order.organizationId,
        code: `PAP-${Date.now().toString().slice(-6)}`,
        title: `Order ${order.orderNumber} stuck in processing for ${hoursStuck}h`,
        description: `Customer: ${order.customerName}. Order value: ₹${order.total.toLocaleString('en-IN')}. Last updated ${order.updatedAt.toLocaleDateString('en-IN')}.`,
        priority: hoursStuck > 72 ? 'P0' : 'P1',
        type: 'TASK',
        department: 'OPERATIONS',
        assigneeId: opsAgent?.id,
        status: 'BACKLOG',
      },
    })
    issuesCreated++
  }

  // ── 2. Blocker Radar ─────────────────────────────────────────────────────
  // Find issues that have been BLOCKED for >7 days with no update and log an Event
  const stalledBlockers = await db.issue.findMany({
    where: { status: 'BLOCKED', updatedAt: { lt: sevenDaysAgo } },
    select: { id: true, organizationId: true, code: true, title: true, priority: true },
  })

  // Group by user
  const blockersByUser = stalledBlockers.reduce<Record<string, typeof stalledBlockers>>((acc, i) => {
    ;(acc[i.organizationId] ??= []).push(i)
    return acc
  }, {})

  for (const [organizationId, blockers] of Object.entries(blockersByUser)) {
    await db.event.create({
      data: {
        organizationId,
        type: 'BLOCKER_RADAR',
        actorName: 'Watchdog',
        summary: `${blockers.length} issue${blockers.length > 1 ? 's' : ''} stalled as BLOCKED for 7+ days`,
        payload: JSON.stringify({ codes: blockers.map(b => b.code) }),
        severity: 'WARN',
      },
    })
  }

  // ── 3. Agent Work Cycle ──────────────────────────────────────────────────
  const { runAllBusyAgents } = await import('@/lib/agent-worker')
  const { withSchedulerLock } = await import('@/lib/scheduler-lock')
  const agentsWorked = await withSchedulerLock('agents', runAllBusyAgents)

  return NextResponse.json({
    ok: true,
    stuckOrders: stuckOrders.length,
    issuesCreated,
    stalledBlockers: stalledBlockers.length,
    agentsWorked,
  })
}
