import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const uid = authResult.user.id
    const [products, orders, customers, transactions, campaigns, aiSystems, restorations, brandChecks, agents, issues, approvals, events] = await Promise.all([
      db.product.findMany({ where: { userId: uid }, select: { id: true, name: true, sku: true, price: true, stock: true, status: true } }),
      db.order.findMany({ where: { userId: uid }, select: { id: true, orderNumber: true, total: true, status: true, createdAt: true } }),
      db.customer.findMany({ where: { userId: uid }, select: { id: true, tier: true, totalSpent: true } }),
      db.transaction.findMany({ where: { userId: uid }, select: { type: true, amount: true, category: true, date: true } }),
      db.campaign.findMany({ where: { userId: uid }, select: { id: true, title: true, status: true, budget: true, spend: true } }),
      db.aISystem.findMany({ where: { userId: uid }, select: { name: true, status: true, health: true, tasksToday: true } }),
      db.restoration.findMany({ where: { userId: uid }, select: { status: true } }),
      db.brandCheck.findMany({ where: { userId: uid }, select: { status: true } }),
      db.agent.findMany({ where: { userId: uid }, select: { code: true, name: true, status: true, tokenSpend: true, tokenBudget: true } }),
      db.issue.findMany({ where: { userId: uid }, select: { status: true } }),
      db.approval.findMany({ where: { userId: uid }, select: { status: true, isRead: true } }),
      db.event.findMany({ where: { userId: uid }, orderBy: { timestamp: 'desc' }, take: 10, select: { id: true, type: true, actorName: true, summary: true, severity: true, timestamp: true } }),
    ])

    const revenue = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)

    const now = new Date()
    const last30 = new Date(now.getTime() - 30 * 86400000)
    const last7 = new Date(now.getTime() - 7 * 86400000)

    const ordersLast30 = orders.filter((o) => new Date(o.createdAt) >= last30)
    const ordersLast7 = orders.filter((o) => new Date(o.createdAt) >= last7)

    const revenueLast30 = transactions.filter((t) => t.type === 'INCOME' && new Date(t.date) >= last30).reduce((s, t) => s + t.amount, 0)
    const expensesLast30 = transactions.filter((t) => t.type === 'EXPENSE' && new Date(t.date) >= last30).reduce((s, t) => s + t.amount, 0)

    const lowStock = products.filter((p) => p.stock <= 20 && p.status !== 'DRAFT')
    const aiHealth = aiSystems.length > 0 ? Math.round(aiSystems.reduce((s, a) => s + a.health, 0) / aiSystems.length) : 100
    const passCount = brandChecks.filter((c) => c.status === 'PASS').length
    const brandCompliance = brandChecks.length > 0 ? Math.round((passCount / brandChecks.length) * 100) : 100

    const salesTrend: { date: string; revenue: number; orders: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayOrders = orders.filter((o) => {
        const d = new Date(o.createdAt)
        return d >= dayStart && d < dayEnd && o.status !== 'CANCELLED' && o.status !== 'RETURNED'
      })
      salesTrend.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      })
    }

    const orderStatusBreakdown: Record<string, number> = {}
    for (const o of orders) {
      orderStatusBreakdown[o.status] = (orderStatusBreakdown[o.status] || 0) + 1
    }

    const tierBreakdown: Record<string, number> = {}
    for (const c of customers) {
      tierBreakdown[c.tier] = (tierBreakdown[c.tier] || 0) + 1
    }

    return createApiResponse({
      kpis: {
        revenue,
        expenses,
        netProfit: revenue - expenses,
        revenueLast30,
        expensesLast30,
        netProfitLast30: revenueLast30 - expensesLast30,
        ordersTotal: orders.length,
        ordersLast30: ordersLast30.length,
        ordersLast7: ordersLast7.length,
        avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length) : 0,
        customersTotal: customers.length,
        activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
        lowStockCount: lowStock.length,
        aiHealth,
        brandCompliance,
        activeCampaigns: campaigns.filter((c) => c.status === 'LIVE').length,
        openRestorations: restorations.filter((r) => r.status === 'REQUESTED' || r.status === 'IN_REPAIR').length,
        activeAgents: agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length,
        totalAgents: agents.length,
        openIssues: issues.filter((i) => i.status === 'BACKLOG' || i.status === 'IN_PROGRESS' || i.status === 'IN_REVIEW').length,
        blockedIssues: issues.filter((i) => i.status === 'BLOCKED').length,
        pendingApprovals: approvals.filter((a) => a.status === 'PENDING').length,
        unreadApprovals: approvals.filter((a) => a.status === 'PENDING' && !a.isRead).length,
        totalAgentSpend: agents.reduce((s, a) => s + a.tokenSpend, 0),
        totalAgentBudget: agents.reduce((s, a) => s + a.tokenBudget, 0),
        cashPosition: revenue - expenses,
        monthlyBurn: Math.round(expenses / 4),
        runwayMonths: revenue - expenses > 0 ? Math.round((revenue - expenses) / (expenses / 4)) : 0,
      },
      salesTrend,
      orderStatusBreakdown,
      tierBreakdown,
      // ponytail: real per-house/color/channel breakdowns need an OrderItem->Product
      // join we don't do here yet; empty for now so the UI renders instead of crashing.
      salesByHouse: {},
      salesByColor: {},
      channelBreakdown: {},
      houses: [],
      colors: [],
      lowStock: lowStock.slice(0, 10),
      recentEvents: events,
    })
  } catch (error) {
    console.error('[API] Dashboard error:', error)
    return createApiError('Failed to fetch dashboard data', 500)
  }
}
