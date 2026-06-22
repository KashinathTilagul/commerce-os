'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'

interface FinanceData {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  margin: number
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
  monthlyTrend: { month: string; income: number; expenses: number; net: number }[]
  recentTransactions: any[]
}

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCT_SALES: 'Product Sales',
  WHOLESALE: 'Wholesale',
  RETAIL: 'Retail',
  MATERIALS: 'Materials',
  LABOR: 'Labor',
  LOGISTICS: 'Logistics',
  MARKETING: 'Marketing',
  OPS: 'Operations',
  AI_INFRA: 'AI Infrastructure',
  RESTORATION: 'Restoration',
  R_AND_D: 'R&D',
}

export function FinanceModule() {
  const { data, isLoading } = useQuery<FinanceData>({
    queryKey: ['finance'],
    queryFn: async () => {
      const r = await fetch('/api/finance')
      return r.json()
    },
  })

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="P&L · Cash Flow · Discipline"
        description="The goal is not sustainability marketing. The goal is structural permanence. Every rupee in must strengthen the House — materials, labor, restoration, AI infrastructure."
        actions={
          <Button size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Generate P&L
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Revenue"
            value={data ? formatINR(data.totalIncome) : '—'}
            delta={12.4}
            deltaLabel="trailing 30d"
            accent="#2F4F3A"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Total Expenses"
            value={data ? formatINR(data.totalExpenses) : '—'}
            delta={-4.2}
            deltaLabel="controlled"
            accent="#C8302A"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <KpiCard
            label="Net Profit"
            value={data ? formatINR(data.netProfit) : '—'}
            delta={18.6}
            deltaLabel="expanding"
            accent="#1F3A5F"
            icon={<Wallet className="h-4 w-4" />}
          />
          <KpiCard
            label="Margin"
            value={data ? `${data.margin}%` : '—'}
            delta={2.1}
            deltaLabel="structural"
            accent="#D4859B"
          />
        </div>

        {/* Monthly trend chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight">Monthly · Last 6 Months</CardTitle>
            <CardDescription className="text-xs">Income, expenses, and net profit per month</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={data?.monthlyTrend || []} />
          </CardContent>
        </Card>

        {/* Income vs Expense breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4 text-arav" /> Income Breakdown
              </CardTitle>
              <CardDescription className="text-xs">Revenue by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data && Object.entries(data.incomeByCat)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const total = Object.values(data.incomeByCat).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? (val / total) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-mono text-muted-foreground">{formatINR(val)} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-arav rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight flex items-center gap-2 text-base">
                <ArrowDownRight className="h-4 w-4 text-agni" /> Expense Breakdown
              </CardTitle>
              <CardDescription className="text-xs">Spending by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data && Object.entries(data.expenseByCat)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const total = Object.values(data.expenseByCat).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? (val / total) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium">{CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-muted-foreground">{formatINR(val)} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-agni rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>

        {/* Transactions table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Recent Transactions</CardTitle>
            <CardDescription className="text-xs">Last 20 movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="text-[10px] tracking-wider uppercase">Date</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Type</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Category</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Description</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm ${
                          t.type === 'INCOME' ? 'bg-arav/10 text-arav' : 'bg-agni/10 text-agni'
                        }`}>
                          {t.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{CATEGORY_LABELS[t.category] || t.category.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${t.type === 'INCOME' ? 'text-arav' : 'text-agni'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatINRFull(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sustainability / structural permanence banner */}
        <Card className="bg-arav/5 border-arav/30">
          <CardContent className="p-6">
            <div className="text-[10px] tracking-[0.25em] uppercase text-arav mb-2">
              Structural Permanence
            </div>
            <div className="font-display text-lg tracking-tight max-w-2xl">
              {data ? `${Math.round((data.totalExpenses / data.totalIncome) * 100)}%` : '—'} of revenue is reinvested into materials, labor, restoration, and AI infrastructure.
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              EKVAAR rejects overproduction. Spending is intentional: 35% on materials and labor, 18% on AI infrastructure, 9% on restoration programs. No trend marketing. No hype spend. Every rupee strengthens the House.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MonthlyChart({ data }: { data: { month: string; income: number; expenses: number; net: number }[] }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1)
  return (
    <div>
      <div className="h-64 flex items-end gap-4 md:gap-8 justify-center pb-4 border-b border-border">
        {data.map((d, i) => {
          const incH = (d.income / max) * 100
          const expH = (d.expenses / max) * 100
          return (
            <div key={d.month} className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
              <div className="text-[10px] font-mono text-arav">{formatINR(d.net)}</div>
              <div className="flex items-end gap-1 h-48 w-full justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${incH}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="w-4 md:w-5 bg-arav rounded-t-sm"
                  title={`Income: ${formatINRFull(d.income)}`}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${expH}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.1 }}
                  className="w-4 md:w-5 bg-agni rounded-t-sm"
                  title={`Expenses: ${formatINRFull(d.expenses)}`}
                />
              </div>
              <div className="text-xs font-medium">{d.month}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-3 bg-arav rounded-sm" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-3 bg-agni rounded-sm" />
          <span>Expenses</span>
        </div>
      </div>
    </div>
  )
}
