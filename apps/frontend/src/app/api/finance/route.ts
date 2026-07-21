import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const userId = auth.user.id

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  // DB-side aggregation for all-time totals/category breakdown (groupBy),
  // a narrow 6-month window for the trend chart, and a capped recent list —
  // instead of pulling every transaction row ever into memory.
  const [byTypeAndCategory, recentWindow, recentTransactions] = await Promise.all([
    db.transaction.groupBy({ by: ['type', 'category'], where: { userId }, _sum: { amount: true } }),
    db.transaction.findMany({
      where: { userId, date: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, date: true },
    }),
    db.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 20 }),
  ])

  let totalIncome = 0
  let totalExpenses = 0
  const incomeByCat: Record<string, number> = {}
  const expenseByCat: Record<string, number> = {}
  for (const row of byTypeAndCategory) {
    const amt = row._sum.amount || 0
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

  return NextResponse.json({
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    margin: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
    incomeByCat,
    expenseByCat,
    monthlyTrend,
    recentTransactions,
  })
}
