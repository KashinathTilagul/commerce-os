'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  TrendingUp, ShoppingBag, Users, Package, Cpu,
  ShieldCheck, AlertTriangle, ArrowUpRight, Sparkles, Bell, GitBranch, Inbox, Wallet,
  Mail, Calendar, MessageSquare, AlertCircle, Loader2, RefreshCw, Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, SectionTitle, HouseBadge, ColorDot } from '../shared'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatINR, formatINRFull } from '@/lib/ekvaar'
import { useAppSubscription } from '@/lib/cpu-websocket'

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
        <div className="h-7 w-24 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

function EventsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

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
    // Workforce
    activeAgents: number
    totalAgents: number
    openIssues: number
    blockedIssues: number
    pendingApprovals: number
    unreadApprovals: number
    totalAgentSpend: number
    totalAgentBudget: number
    // Reality layer
    cashPosition: number
    monthlyBurn: number
    runwayMonths: number
  }
  salesByHouse: Record<string, number>
  salesByColor: Record<string, number>
  salesTrend: { date: string; revenue: number; orders: number }[]
  orderStatusBreakdown: Record<string, number>
  channelBreakdown: Record<string, number>
  lowStock: any[]
  houses: string[]
  colors: string[]
  recentEvents: any[]
}

export function CommandCenter({ onNavigate }: { onNavigate: (m: string) => void }) {
  const [briefingOpen, setBriefingOpen] = useState(false)

  const { data: orgContext } = useQuery({
    queryKey: ['org-context'],
    queryFn: async () => {
      const res = await fetch('/api/organization/context')
      if (!res.ok) return null
      return res.json()
    }
  })

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error('Failed to fetch dashboard')
      return r.json()
    },
    staleTime: 30000,
  })

  useAppSubscription('dashboard')

  const k = data?.kpis

  const safeDiv = (a: number, b: number) => b > 0 ? a / b : 0

  if (isLoading) {
    return (
      <div>
        <PageHeader
          eyebrow="Board Room · Reality Layer"
          title="All-Time Operations"
          description="Loading dashboard data..."
        />
        <div className="px-4 lg:px-8 py-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <KpiSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-5"><div className="h-20 bg-muted rounded animate-pulse" /></CardContent></Card>)}
          </div>
          <EventsSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Board Room · Reality Layer"
        title="All-Time Operations"
        description="EKVAAR is a permanent Indian cultural fashion house. Built against disposability. Designed once. Worn forever. This is the operating system that holds the House together — powered by a digital C-suite of 12 autonomous agents."
        actions={
          <>
            <Badge variant="outline" className="gap-1.5">
              <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
              {k?.activeAgents || 0} agents active
            </Badge>
            {k && k.unreadApprovals > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 border-agni/40 text-agni" onClick={() => onNavigate('inbox' as any)}>
                <Bell className="h-3.5 w-3.5" />
                {k.unreadApprovals} pending
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBriefingOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" />
              Founder Brief
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-10">
        {error && (
          <Card className="border-agni/40 bg-agni/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-agni" />
              <div>
                <div className="font-medium text-sm">Unable to load dashboard</div>
                <div className="text-xs text-muted-foreground">Data may be stale. Check your connection.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue (Lifetime)"
            value={k ? formatINR(k.revenue) : '—'}
            delta={k && k.revenueLast30 && k.revenue > 0 ? Math.round((safeDiv(k.revenueLast30, 30) / safeDiv(k.revenue, 365)) * 100 - 100) : undefined}
            deltaLabel="vs daily avg"
            accent="#2F4F3A"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Net Profit (30d)"
            value={k ? formatINR(k.netProfitLast30) : '—'}
            delta={k && k.revenueLast30 > 0 ? Math.round(safeDiv(k.netProfitLast30, k.revenueLast30) * 100) : undefined}
            deltaLabel="% margin"
            accent="#C8302A"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Orders (30d)"
            value={k ? String(k.ordersLast30) : '—'}
            delta={k && k.ordersLast7 > 0 ? Math.round((safeDiv(k.ordersLast7, 7) / safeDiv(k.ordersLast30, 30)) * 100 - 100) : undefined}
            deltaLabel="7d vs 30d avg"
            accent="#1F3A5F"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <KpiCard
            label="Avg Order Value"
            value={k ? formatINR(k.avgOrderValue) : '—'}
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

        {/* Reality Layer — Cash Position, Runway, Workforce */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-noor text-rui border-0">
            <CardContent className="p-5">
              <div className="text-[10px] tracking-[0.25em] uppercase text-rui/50 mb-2 flex items-center gap-1.5">
                <Wallet className="h-3 w-3" /> Cash Position
              </div>
              <div className="font-display text-3xl tracking-tight">
                {k ? formatINR(k.cashPosition) : '—'}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-rui/50 text-[10px] tracking-wider uppercase">Monthly Burn</div>
                  <div className="font-mono mt-0.5">{k ? formatINR(k.monthlyBurn) : '—'}</div>
                </div>
                <div>
                  <div className="text-rui/50 text-[10px] tracking-wider uppercase">Runway</div>
                  <div className="font-mono mt-0.5">{k ? `${k.runwayMonths} months` : '—'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-foreground/40 transition-colors" onClick={() => onNavigate('inbox' as any)}>
            <CardContent className="p-5">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Inbox className="h-3 w-3" /> Founder Inbox
              </div>
              <div className="font-display text-3xl tracking-tight">
                {k ? String(k.pendingApprovals) : '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">pending decisions</div>
              <div className="mt-3 flex items-center gap-2">
                {k && k.unreadApprovals > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] tracking-wider uppercase rounded-sm bg-agni/10 text-agni">
                    <Bell className="h-2.5 w-2.5" /> {k.unreadApprovals} unread
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">requires founder attention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-foreground/40 transition-colors" onClick={() => onNavigate('agents' as any)}>
            <CardContent className="p-5">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Cpu className="h-3 w-3" /> Digital Workforce
              </div>
              <div className="font-display text-3xl tracking-tight">
                {k ? `${k.activeAgents}/${k.totalAgents}` : '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">agents active</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">Token Spend</div>
                  <div className="font-mono mt-0.5">{k ? formatINR(k.totalAgentSpend) : '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">Open Issues</div>
                  <div className="font-mono mt-0.5">{k ? String(k.openIssues) : '—'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent system events */}
        {data?.recentEvents && data.recentEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" /> Recent System Events
                </CardTitle>
                <CardDescription className="text-xs">Live from the Heartbeat Engine</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('terminal' as any)}>
                Open Terminal <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.recentEvents.slice(0, 5).map((e: any) => {
                const sevColor = e.severity === 'CRITICAL' || e.severity === 'ERROR' ? '#C8302A' : e.severity === 'WARN' ? '#D4859B' : '#1F3A5F'
                return (
                  <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0 text-xs">
                    <span className="text-muted-foreground font-mono text-[10px] w-16 flex-shrink-0">
                      {new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                    <span className="font-mono text-[10px] flex-shrink-0 w-32 truncate" style={{ color: sevColor }}>
                      [{e.type}]
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">{e.actorName || 'system'}:</span>
                    <span className="flex-1 truncate">{e.summary}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

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
              {Object.entries(data?.salesByHouse ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([house, val]) => {
                  const total = Object.values(data?.salesByHouse ?? {}).reduce((s, v) => s + v, 0)
                  const pct = safeDiv(val, total) * 100
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
                          className="h-full rounded-full"
                          style={{ backgroundColor: houseColor(house) }}
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
              {Object.entries(data?.salesByColor ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([color, val]) => {
                  const total = Object.values(data?.salesByColor ?? {}).reduce((s, v) => s + v, 0)
                  const pct = safeDiv(val, total) * 100
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
                {Object.entries(data?.orderStatusBreakdown ?? {}).map(([status, count]) => (
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
                {Object.entries(data?.channelBreakdown ?? {}).map(([ch, val]) => (
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
              {(data?.lowStock ?? []).slice(0, 5).map((p) => (
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
              {orgContext?.policies ? (
                orgContext.policies.split('\n').filter(Boolean).map((p: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-agni mt-0.5">—</span>
                    <span className="text-foreground/80">{p}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground italic">No operating principles defined for this organization yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* House of Originals cards */}
        <div>
          <SectionTitle hint="Categorized knowledge">
            Knowledge Assets
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(data?.houses || []).map((catName: string) => (
              <button
                key={catName}
                onClick={() => onNavigate('explorer')}
                className="arch-card p-5 text-left hover:border-foreground/40 transition-all group"
              >
                <div className="mt-3 font-display text-lg tracking-tight">{catName}</div>
                <div className="mt-4 flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Enter <ArrowUpRight className="h-3 w-3 ml-1" />
                </div>
              </button>
            ))}
            {(data?.houses || []).length === 0 && (
              <div className="col-span-5 text-sm text-muted-foreground">No assets found.</div>
            )}
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

      <BriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </div>
  )
}

function BriefingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['briefing'],
    queryFn: async () => {
      const r = await fetch('/api/briefing')
      if (!r.ok) throw new Error('Failed to fetch briefing')
      return r.json()
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const db = data?.db
  const totalUrgent = (db?.blockedIssues?.length || 0) + (db?.urgentIssues?.length || 0) +
    (db?.pendingApprovals?.length || 0) + (db?.stuckOrders?.length || 0)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-display tracking-tight">Founder Brief</span>
            <div className="flex items-center gap-2">
              {data && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Assembling your brief…</span>
          </div>
        )}

        {data && (
          <div className="space-y-5 mt-1">
            {/* Summary bar */}
            {totalUrgent > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-agni/5 border border-agni/20">
                <AlertCircle className="h-4 w-4 text-agni shrink-0" />
                <span className="text-sm text-agni font-medium">{totalUrgent} item{totalUrgent > 1 ? 's' : ''} need your attention today</span>
              </div>
            )}

            {/* Stuck Orders */}
            {db?.stuckOrders?.length > 0 && (
              <BriefSection icon={<ShoppingBag className="h-4 w-4" />} title="Orders Stuck in Processing" accent="text-agni">
                {db.stuckOrders.map((o: any) => (
                  <BriefRow key={o.id} label={`#${o.orderNumber} · ${o.customerName}`}
                    value={`₹${o.total.toLocaleString('en-IN')} · ${Math.round((Date.now() - new Date(o.updatedAt).getTime()) / 3600000)}h stuck`}
                    urgent />
                ))}
              </BriefSection>
            )}

            {/* P0 Issues */}
            {db?.urgentIssues?.length > 0 && (
              <BriefSection icon={<AlertTriangle className="h-4 w-4" />} title="P0 Issues Open" accent="text-agni">
                {db.urgentIssues.map((i: any) => (
                  <BriefRow key={i.id} label={i.code} value={i.title} urgent />
                ))}
              </BriefSection>
            )}

            {/* Blocked Issues */}
            {db?.blockedIssues?.length > 0 && (
              <BriefSection icon={<AlertTriangle className="h-4 w-4" />} title="Blocked Issues">
                {db.blockedIssues.map((i: any) => (
                  <BriefRow key={i.id} label={i.code} value={i.title} badge={i.priority} />
                ))}
              </BriefSection>
            )}

            {/* Pending Approvals */}
            {db?.pendingApprovals?.length > 0 && (
              <BriefSection icon={<Inbox className="h-4 w-4" />} title="Awaiting Your Approval">
                {db.pendingApprovals.map((a: any) => (
                  <BriefRow key={a.id} label={a.type} value={a.title}
                    badge={a.amount > 0 ? `₹${a.amount.toLocaleString('en-IN')}` : undefined} />
                ))}
              </BriefSection>
            )}

            {/* Gmail */}
            {data.gmail ? (
              <BriefSection icon={<Mail className="h-4 w-4" />} title="Important Emails">
                {(data.gmail.emails || data.gmail.messages || []).slice(0, 5).map((m: any, i: number) => (
                  <BriefRow key={i} label={m.from || m.sender || 'Unknown sender'} value={m.subject || m.snippet || '—'} />
                ))}
                {!(data.gmail.emails || data.gmail.messages)?.length && (
                  <p className="text-xs text-muted-foreground">No important unread emails.</p>
                )}
              </BriefSection>
            ) : (
              <NotConnected label="Gmail" icon={<Mail className="h-4 w-4" />} error={data.gmailError} />
            )}

            {/* Google Calendar */}
            {data.calendar ? (
              <BriefSection icon={<Calendar className="h-4 w-4" />} title="Today's Meetings">
                {(data.calendar.items || data.calendar.events || []).slice(0, 8).map((e: any, i: number) => (
                  <BriefRow key={i}
                    label={e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'All day'}
                    value={e.summary || e.title || '—'} />
                ))}
                {!(data.calendar.items || data.calendar.events)?.length && (
                  <p className="text-xs text-muted-foreground">No meetings today.</p>
                )}
              </BriefSection>
            ) : (
              <NotConnected label="Google Calendar" icon={<Calendar className="h-4 w-4" />} error={data.calendarError} />
            )}

            {/* Discord */}
            {data.discord ? (
              <BriefSection icon={<MessageSquare className="h-4 w-4" />} title="Discord Mentions">
                {(data.discord.messages || []).slice(0, 5).map((m: any, i: number) => (
                  <BriefRow key={i} label={m.author?.username || m.authorName || 'Unknown'} value={m.content || '—'} />
                ))}
                {!data.discord.messages?.length && (
                  <p className="text-xs text-muted-foreground">No unread mentions.</p>
                )}
              </BriefSection>
            ) : (
              <NotConnected label="Discord" icon={<MessageSquare className="h-4 w-4" />} error={data.discordError} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BriefSection({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 ${accent || 'text-foreground'}`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-1 pl-6">{children}</div>
    </div>
  )
}

function BriefRow({ label, value, badge, urgent }: { label: string; value: string; badge?: string; urgent?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 ${urgent ? 'text-agni' : ''}`}>
      <span className="text-xs font-mono shrink-0 text-muted-foreground w-28 truncate">{label}</span>
      <span className="text-xs flex-1 leading-relaxed">{value}</span>
      {badge && <Badge variant="outline" className="text-[10px] shrink-0">{badge}</Badge>}
    </div>
  )
}

function NotConnected({ label, icon, error }: { label: string; icon: React.ReactNode; error?: string | null }) {
  const notConnected = !error || error.includes('not connected')
  return (
    <div className="flex items-start gap-2 text-muted-foreground/50">
      {icon}
      <span className="text-xs leading-relaxed">
        {notConnected
          ? `${label} — not connected. Connect in Integrations.`
          : `${label} — ${error}`}
      </span>
    </div>
  )
}

function houseColor(house: string): string {
  const map: Record<string, string> = {
    Solids: '#1C1C1E',
    Layers: '#1F3A5F',
    Street: '#C8302A',
    Luxe: '#F5F1EA',
    Origins: '#D4859B',
  }
  return map[house] || '#8E8E93'
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
