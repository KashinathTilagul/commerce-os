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

  // Monthly trend (last 6 months) — bucketed from the bounded window fetch above
  const now = new Date()
  const monthlyTrend: { month: string; income: number; expenses: number; net: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const mIncome = recentWindow
      .filter((t) => t.type === 'INCOME' && t.date >= monthStart && t.date < monthEnd)
      .reduce((s, t) => s + t.amount, 0)
    const mExpenses = recentWindow
      .filter((t) => t.type === 'EXPENSE' && t.date >= monthStart && t.date < monthEnd)
      .reduce((s, t) => s + t.amount, 0)
    monthlyTrend.push({
      month: monthStart.toLocaleString('en-US', { month: 'short' }),
      income: mIncome,
      expenses: mExpenses,
      net: mIncome - mExpenses,
    })
  }

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
