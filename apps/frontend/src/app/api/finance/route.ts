import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const transactions = await db.transaction.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: 'desc' },
  })

  const income = transactions.filter((t) => t.type === 'INCOME')
  const expenses = transactions.filter((t) => t.type === 'EXPENSE')

  const totalIncome = income.reduce((s, t) => s + t.amount, 0)
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)

  // Income by category
  const incomeByCat: Record<string, number> = {}
  for (const t of income) incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount

  // Expenses by category
  const expenseByCat: Record<string, number> = {}
  for (const t of expenses) expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount

  // Monthly trend (last 6 months)
  const now = new Date()
  const monthlyTrend: { month: string; income: number; expenses: number; net: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const mIncome = income
      .filter((t) => new Date(t.date) >= monthStart && new Date(t.date) < monthEnd)
      .reduce((s, t) => s + t.amount, 0)
    const mExpenses = expenses
      .filter((t) => new Date(t.date) >= monthStart && new Date(t.date) < monthEnd)
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
    recentTransactions: transactions.slice(0, 20),
  })
}
