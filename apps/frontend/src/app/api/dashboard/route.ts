import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [products, orders, customers, transactions, campaigns, aiSystems, restorations, brandChecks, agents, issues, approvals, events] = await Promise.all([
    db.product.findMany(),
    db.order.findMany(),
    db.customer.findMany(),
    db.transaction.findMany(),
    db.campaign.findMany(),
    db.aISystem.findMany(),
    db.restoration.findMany(),
    db.brandCheck.findMany(),
    db.agent.findMany(),
    db.issue.findMany(),
    db.approval.findMany(),
    db.event.findMany({ orderBy: { timestamp: 'desc' }, take: 10 }),
  ])

  const revenue = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + t.amount, 0)
  const expenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0)

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 86400000)
  const last7 = new Date(now.getTime() - 7 * 86400000)

  const ordersLast30 = orders.filter((o) => new Date(o.createdAt) >= last30)
  const ordersLast7 = orders.filter((o) => new Date(o.createdAt) >= last7)

  const revenueLast30 = transactions
    .filter((t) => t.type === 'INCOME' && new Date(t.date) >= last30)
    .reduce((s, t) => s + t.amount, 0)
  const expensesLast30 = transactions
    .filter((t) => t.type === 'EXPENSE' && new Date(t.date) >= last30)
    .reduce((s, t) => s + t.amount, 0)

  // Sales by house
  const ordersWithItems = await db.order.findMany({
    include: { items: { include: { product: true } } },
  })
  const salesByHouse: Record<string, number> = {}
  for (const o of ordersWithItems) {
    if (o.status === 'CANCELLED' || o.status === 'RETURNED') continue
    for (const item of o.items) {
      const h = item.product.house
      salesByHouse[h] = (salesByHouse[h] || 0) + item.price * item.quantity
    }
  }

  // Sales by color
  const salesByColor: Record<string, number> = {}
  for (const o of ordersWithItems) {
    if (o.status === 'CANCELLED' || o.status === 'RETURNED') continue
    for (const item of o.items) {
      const c = item.product.color
      salesByColor[c] = (salesByColor[c] || 0) + item.price * item.quantity
    }
  }

  // Sales trend last 14 days
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

  // Order status breakdown
  const orderStatusBreakdown: Record<string, number> = {}
  for (const o of orders) {
    orderStatusBreakdown[o.status] = (orderStatusBreakdown[o.status] || 0) + 1
  }

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {}
  for (const o of orders) {
    if (o.status === 'CANCELLED' || o.status === 'RETURNED') continue
    channelBreakdown[o.channel] = (channelBreakdown[o.channel] || 0) + o.total
  }

  // Low stock
  const lowStock = products.filter((p) => p.stock <= p.reorderAt && p.status !== 'DRAFT')

  // AI health
  const aiHealth = aiSystems.length > 0
    ? Math.round(aiSystems.reduce((s, a) => s + a.health, 0) / aiSystems.length)
    : 100

  // Brand compliance
  const passCount = brandChecks.filter((c) => c.status === 'PASS').length
  const brandCompliance = brandChecks.length > 0
    ? Math.round((passCount / brandChecks.length) * 100)
    : 100

  return NextResponse.json({
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
      avgOrderValue: orders.length > 0
        ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length)
        : 0,
      customersTotal: customers.length,
      activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
      lowStockCount: lowStock.length,
      aiHealth,
      brandCompliance,
      activeCampaigns: campaigns.filter((c) => c.status === 'LIVE').length,
      openRestorations: restorations.filter((r) => r.status === 'REQUESTED' || r.status === 'IN_REPAIR').length,
      // Workforce / Decision Compression metrics
      activeAgents: agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length,
      totalAgents: agents.length,
      openIssues: issues.filter((i) => i.status === 'BACKLOG' || i.status === 'IN_PROGRESS' || i.status === 'IN_REVIEW').length,
      blockedIssues: issues.filter((i) => i.status === 'BLOCKED').length,
      pendingApprovals: approvals.filter((a) => a.status === 'PENDING').length,
      unreadApprovals: approvals.filter((a) => a.status === 'PENDING' && !a.isRead).length,
      totalAgentSpend: agents.reduce((s, a) => s + a.tokenSpend, 0),
      totalAgentBudget: agents.reduce((s, a) => s + a.tokenBudget, 0),
      // Reality layer — cash & runway
      cashPosition: revenue - expenses,
      monthlyBurn: Math.round(expenses / 4), // ~4 months of data
      runwayMonths: revenue - expenses > 0 ? Math.round((revenue - expenses) / (expenses / 4)) : 0,
    },
    salesByHouse,
    salesByColor,
    salesTrend,
    orderStatusBreakdown,
    channelBreakdown,
    lowStock,
    houses: ['Solids', 'Layers', 'Street', 'Luxe', 'Origins'],
    colors: ['Noor Black', 'Rui White', 'Agni Red', 'Neel Blue', 'Arav Green', 'Gulabi Pink'],
    recentEvents: events,
  })
}
