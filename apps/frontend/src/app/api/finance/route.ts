import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization, requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const organizationId = auth.organizationId

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  // DB-side aggregation for all-time totals/category breakdown (groupBy),
  // a narrow 6-month window for the trend chart, and a capped recent list —
  // instead of pulling every transaction row ever into memory.
  const [byTypeAndCategory, recentWindow, recentTransactions, paidOrders, customers] = await Promise.all([
    db.transaction.groupBy({ by: ['type', 'category'], where: { organizationId }, _sum: { amount: true } }),
    db.transaction.findMany({
      where: { organizationId, date: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, date: true },
    }),
    db.transaction.findMany({ where: { organizationId }, orderBy: { date: 'desc' }, take: 20 }),
    db.order.findMany({ where: { organizationId }, select: { total: true, status: true, paymentStatus: true } }),
    db.customer.findMany({ where: { organizationId }, select: { totalSpent: true } }),
  ])

  let totalIncome = 0
  let totalExpenses = 0
  const incomeByCat: Record<string, number> = {}
  const expenseByCat: Record<string, number> = {}
  for (const row of byTypeAndCategory) {
    const amt = row._sum?.amount || 0 || 0
    if (row.type === 'INCOME') {
      totalIncome += amt
      incomeByCat[row.category] = (incomeByCat[row.category] || 0) + amt
    } else if (row.type === 'EXPENSE') {
      totalExpenses += amt
      expenseByCat[row.category] = (expenseByCat[row.category] || 0) + amt
    }
  }

  const now = new Date()
  const byMonth = recentWindow.reduce<Record<string, { income: number; expenses: number }>>((m, t) => {
    const key = `${t.date.getFullYear()}-${t.date.getMonth()}`
    if (!m[key]) m[key] = { income: 0, expenses: 0 }
    if (t.type === 'INCOME') m[key].income += t.amount
    else if (t.type === 'EXPENSE') m[key].expenses += t.amount
    return m
  }, {})
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const { income = 0, expenses = 0 } = byMonth[`${d.getFullYear()}-${d.getMonth()}`] ?? {}
    return { month: d.toLocaleString('en-US', { month: 'short' }), income, expenses, net: income - expenses }
  })

  const eligibleOrders = paidOrders.filter((o) => o.paymentStatus === 'PAID' && !['CANCELLED', 'RETURNED'].includes(o.status))
  const orderRevenue = eligibleOrders.reduce((sum, order) => sum + order.total, 0)
  const customerLifetimeRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)
  const commerceRevenue = orderRevenue || customerLifetimeRevenue

  return NextResponse.json({
    totalIncome,
    allTimeRevenue: totalIncome + commerceRevenue,
    commerceRevenue,
    commerceRevenueSource: orderRevenue > 0 ? 'orders' : customerLifetimeRevenue > 0 ? 'customer_lifetime' : 'none',
    commerceOrderCount: eligibleOrders.length,
    customerLifetimeRevenue,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    margin: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
    incomeByCat,
    expenseByCat,
    monthlyTrend,
    recentTransactions,
  })
}
