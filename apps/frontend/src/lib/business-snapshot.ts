import { db } from '@/lib/db'

// Live business snapshot for AI grounding (Krishna + Digital Employee chats).
// Uses DB-side aggregation instead of pulling raw order/transaction rows into
// app memory — smaller payload sent to the model, and the DB does the sum
// instead of JS iterating hundreds of rows.
export async function getLiveBusinessSnapshot(userId: string): Promise<string> {
  try {
    const last30 = new Date(Date.now() - 30 * 86400000)

    const [
      revenueAgg, expenseAgg, recentRevenueAgg,
      pendingOrders, approvals, openIssuesCount, blockedIssues,
      totalAgents, runningAgents, aiHealthAgg, lowStock,
    ] = await Promise.all([
      db.transaction.aggregate({ where: { userId, type: 'INCOME' }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: 'EXPENSE' }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: 'INCOME', date: { gte: last30 } }, _sum: { amount: true } }),
      db.order.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      db.approval.findMany({ where: { userId, status: 'PENDING' }, select: { code: true, title: true }, take: 5 }),
      db.issue.count({ where: { userId, status: { in: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'] } } }),
      db.issue.findMany({ where: { userId, status: 'BLOCKED' }, select: { code: true }, take: 3 }),
      db.agent.count({ where: { userId } }),
      db.agent.count({ where: { userId, status: { in: ['ACTIVE', 'RUNNING'] } } }),
      db.aISystem.aggregate({ where: { userId }, _avg: { health: true } }),
      db.product.findMany({ where: { userId, stock: { lte: 10 }, status: 'ACTIVE' }, select: { name: true, stock: true }, take: 3 }),
    ])

    const revenue = revenueAgg._sum.amount || 0
    const expenses = expenseAgg._sum.amount || 0
    const recentRevenue = recentRevenueAgg._sum.amount || 0
    const avgAiHealth = aiHealthAgg._avg.health != null ? Math.round(aiHealthAgg._avg.health) : 100

    return `
LIVE SYSTEM STATUS (real-time data as of now):
- Total Revenue: ₹${(revenue / 100000).toFixed(1)} lakh | Last 30 days: ₹${(recentRevenue / 100000).toFixed(1)} lakh
- Net P&L: ₹${((revenue - expenses) / 100000).toFixed(1)} lakh
- Orders pending/processing: ${pendingOrders}
- Pending approvals: ${approvals.length}${approvals.length > 0 ? ` → [${approvals.slice(0, 3).map(a => `${a.code}: ${a.title}`).join(', ')}]` : ''}
- Open issues: ${openIssuesCount}${blockedIssues.length > 0 ? ` (${blockedIssues.length} BLOCKED: ${blockedIssues.map(i => i.code).join(', ')})` : ''}
- AI agents running: ${runningAgents}/${totalAgents}
- AI system health: ${avgAiHealth}%
- Critical low stock: ${lowStock.length > 0 ? lowStock.map(p => `${p.name} (${p.stock} left)`).join(', ') : 'None'}
`.trim()
  } catch {
    return 'Live system data temporarily unavailable.'
  }
}
