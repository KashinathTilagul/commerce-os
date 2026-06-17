'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Package, Cpu,
  ShieldCheck, AlertTriangle, ArrowUpRight, Sparkles, Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, SectionTitle, HouseBadge, ColorDot, StatusPill } from '../shared'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatINR, formatINRFull, timeAgo, EKVAAR_HOUSES, type ModuleId } from '@/lib/ekvaar'

interface DashboardData {
  kpis: {
    revenue: number
    expenses: number
    netProfit: number
    revenueLast30: number
    expensesLast30: number
    netProfitLast30: number
    ordersTotal: number
    ordersLast30: number
    ordersLast7: number
    avgOrderValue: number
    customersTotal: number
    activeProducts: number
    lowStockCount: number
    aiHealth: number
    brandCompliance: number
    activeCampaigns: number
    openRestorations: number
  }
  salesByHouse: Record<string, number>
  salesByColor: Record<string, number>
  salesTrend: { date: string; revenue: number; orders: number }[]
  orderStatusBreakdown: Record<string, number>
  channelBreakdown: Record<string, number>
  lowStock: any[]
  houses: string[]
  colors: string[]
}

export function CommandCenter({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard')
      return r.json()
    },
  })

  const k = data?.kpis

  return (
    <div>
      <PageHeader
        eyebrow="Command Center"
        title="All-Time Operations"
        description="EKVAAR is a permanent Indian cultural fashion house. Built against disposability. Designed once. Worn forever. This is the operating system that holds the House together."
        actions={
          <>
            <Badge variant="outline" className="gap-1.5">
              <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
              All systems nominal
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Founder Brief
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue (Lifetime)"
            value={k ? formatINR(k.revenue) : '—'}
            delta={12.4}
            deltaLabel="vs last 30d"
            accent="#2F4F3A"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Net Profit (30d)"
            value={k ? formatINR(k.netProfitLast30) : '—'}
            delta={8.1}
            deltaLabel="margin expanding"
            accent="#C8302A"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Orders (30d)"
            value={k ? String(k.ordersLast30) : '—'}
            delta={5.2}
            deltaLabel="14d rolling"
            accent="#1F3A5F"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <KpiCard
            label="Avg Order Value"
            value={k ? formatINR(k.avgOrderValue) : '—'}
            delta={3.4}
            deltaLabel="premium holding"
            accent="#D4859B"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Originals (Members)" value={k ? String(k.customersTotal) : '—'} accent="#1F3A5F" icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Active Products" value={k ? String(k.activeProducts) : '—'} accent="#2F4F3A" icon={<Package className="h-4 w-4" />} />
          <KpiCard label="AI Health" value={k ? `${k.aiHealth}%` : '—'} accent="#D4859B" icon={<Cpu className="h-4 w-4" />} />
          <KpiCard label="Brand Compliance" value={k ? `${k.brandCompliance}%` : '—'} accent="#C8302A" icon={<ShieldCheck className="h-4 w-4" />} />
        </div>

        {/* Sales trend + House breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight">Revenue · Last 14 Days</CardTitle>
              <CardDescription className="text-xs">
                Daily revenue across all channels — D2C, Retail, Wholesale, Pop-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart data={data?.salesTrend || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight">Sales by House</CardTitle>
              <CardDescription className="text-xs">House of Originals distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data && Object.entries(data.salesByHouse)
                .sort((a, b) => b[1] - a[1])
                .map(([house, val]) => {
                  const total = Object.values(data.salesByHouse).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? (val / total) * 100 : 0
                  return (
                    <div key={house}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <HouseBadge house={house} />
                        </div>
                        <span className="font-mono text-muted-foreground">{formatINR(val)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full ${houseColor(house)}`}
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>

        {/* Color system + Order pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight">The Six Colors</CardTitle>
              <CardDescription className="text-xs">Permanent palette · cross-collection compatibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data && Object.entries(data.salesByColor)
                .sort((a, b) => b[1] - a[1])
                .map(([color, val]) => {
                  const total = Object.values(data.salesByColor).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? (val / total) * 100 : 0
                  return (
                    <div key={color} className="flex items-center gap-3">
                      <ColorDot color={color} size={14} />
                      <div className="flex-1 text-xs">{color}</div>
                      <div className="text-xs text-muted-foreground font-mono">{pct.toFixed(1)}%</div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight">Order Pipeline</CardTitle>
              <CardDescription className="text-xs">Status distribution across all orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {data && Object.entries(data.orderStatusBreakdown).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => onNavigate('sales')}
                    className="arch-card p-3 text-left hover:border-foreground/30 transition-colors"
                  >
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1">
                      {status}
                    </div>
                    <div className="font-display text-2xl">{count}</div>
                  </button>
                ))}
              </div>
              <div className="brand-divider my-5" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data && Object.entries(data.channelBreakdown).map(([ch, val]) => (
                  <div key={ch} className="text-xs">
                    <div className="text-muted-foreground">{ch}</div>
                    <div className="font-mono mt-1">{formatINR(val)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low stock alerts + Principles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-agni" />
                  Restock Signals
                </CardTitle>
                <CardDescription className="text-xs">Items at or below reorder threshold</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('inventory')}>
                View all <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <div className="flex items-center gap-3">
                    <ColorDot color={p.color} size={12} />
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.sku} · {p.house}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-agni">{p.stock} left</div>
                    <div className="text-[10px] text-muted-foreground">reorder at {p.reorderAt}</div>
                  </div>
                </div>
              )) || <div className="text-sm text-muted-foreground">Loading…</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight">Operating Principles</CardTitle>
              <CardDescription className="text-xs">Every decision must strengthen the House</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {[
                'Permanence over speed',
                'Systems over chaos',
                'Identity over trends',
                'Originality over imitation',
                'Restraint over excess',
                'Long-term relevance over virality',
                'Culture over algorithms',
              ].map((p) => (
                <div key={p} className="flex items-start gap-2">
                  <span className="text-agni mt-0.5">—</span>
                  <span className="text-foreground/80">{p}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* House of Originals cards */}
        <div>
          <SectionTitle hint="5 categories · boundaries are the discipline">
            House of Originals
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {EKVAAR_HOUSES.map((h) => (
              <button
                key={h.name}
                onClick={() => onNavigate('house')}
                className="arch-card p-5 text-left hover:border-foreground/40 transition-all group"
              >
                <HouseBadge house={h.name} />
                <div className="mt-3 font-display text-lg tracking-tight">{h.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {h.description}
                </div>
                <div className="mt-4 flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Enter <ArrowUpRight className="h-3 w-3 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer manifesto */}
        <Card className="bg-noor text-rui border-0 relative overflow-hidden">
          <CardContent className="p-8 md:p-12 relative z-10">
            <div className="text-[10px] tracking-[0.3em] uppercase text-rui/50 mb-4">
              Founder Note
            </div>
            <div className="font-display text-xl md:text-3xl tracking-tight leading-tight max-w-3xl">
              "We didn't start with a plan. We started with a pause."
            </div>
            <div className="mt-6 text-sm text-rui/60 max-w-2xl leading-relaxed">
              One time — chosen with intent. All time — relevant across time. EKVAAR is not a clothing brand. It is a cultural and design system, operated from this command center.
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs">
              <div className="h-px w-12 bg-rui/30" />
              <span className="tracking-[0.2em] uppercase text-rui/50">EKVAAR · India ka Original</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function houseColor(house: string): string {
  const map: Record<string, string> = {
    Solids: 'bg-foreground/70',
    Layers: 'bg-neel',
    Street: 'bg-agni',
    Luxe: 'bg-noor dark:bg-rui',
    Origins: 'bg-arav',
  }
  return map[house] || 'bg-muted-foreground'
}

function RevenueTrendChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  if (!data.length) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
  const max = Math.max(...data.map((d) => d.revenue), 1)
  return (
    <div>
      <div className="h-48 flex items-end gap-1.5">
        {data.map((d, i) => {
          const h = (d.revenue / max) * 100
          return (
            <motion.div
              key={d.date}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
              className="flex-1 bg-gradient-to-t from-arav/30 to-arav rounded-t-sm min-h-[2px] hover:from-arav/50 hover:to-arav transition-colors group relative"
              title={`${d.date}: ${formatINRFull(d.revenue)} · ${d.orders} orders`}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                {formatINR(d.revenue)}
              </div>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>14-day rolling</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
