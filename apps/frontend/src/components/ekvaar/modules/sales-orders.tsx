'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Search, Download, ShoppingBag, TrendingUp, MapPin, Zap, AlertOctagon } from 'lucide-react'
import { PageHeader, StatusPill, HouseBadge, ColorDot, KpiCard } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'

export function SalesOrders() {
  const [status, setStatus] = useState('ALL')
  const [channel, setChannel] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['orders', status, channel],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status !== 'ALL') params.set('status', status)
      if (channel !== 'ALL') params.set('channel', channel)
      const r = await fetch(`/api/orders?${params}`)
      if (!r.ok) throw new Error('Failed to fetch orders')
      return r.json()
    },
  })

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.customerName.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [orders, search])

  const totalRevenue = filtered.filter(o => o.status !== 'CANCELLED' && o.status !== 'RETURNED').reduce((s, o) => s + o.total, 0)
  const avgOrder = filtered.length > 0 ? totalRevenue / filtered.length : 0

  // Status counts
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of orders) m[o.status] = (m[o.status] || 0) + 1
    return m
  }, [orders])

  // Channel velocity — order count/revenue per channel, plus orders stuck in
  // PROCESSING for 3+ days (the "ORDER_STUCK" signal the roadmap calls for)
  const channelStats = useMemo(() => {
    const m: Record<string, { count: number; revenue: number; stuck: number }> = {}
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    for (const o of orders) {
      if (!m[o.channel]) m[o.channel] = { count: 0, revenue: 0, stuck: 0 }
      m[o.channel].count++
      if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') m[o.channel].revenue += o.total
      if (o.status === 'PROCESSING' && new Date(o.createdAt).getTime() < threeDaysAgo) m[o.channel].stuck++
    }
    return Object.entries(m).sort((a, b) => b[1].revenue - a[1].revenue)
  }, [orders])

  // Top cities
  const cityStats = useMemo(() => {
    const m: Record<string, { count: number; revenue: number }> = {}
    for (const o of orders) {
      if (o.status === 'CANCELLED' || o.status === 'RETURNED') continue
      if (!m[o.customerCity]) m[o.customerCity] = { count: 0, revenue: 0 }
      m[o.customerCity].count++
      m[o.customerCity].revenue += o.total
    }
    return Object.entries(m).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6)
  }, [orders])

  return (
    <div>
      <PageHeader
        eyebrow="Sales & Orders"
        title="Order Pipeline"
        description="Track real orders, revenue, fulfillment status, and sales channels from your connected commerce systems."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Orders" value={String(orders.length)} accent="#1F3A5F" icon={<ShoppingBag className="h-4 w-4" />} />
          <KpiCard label="Filtered Revenue" value={formatINR(totalRevenue)} accent="#2F4F3A" icon={<TrendingUp className="h-4 w-4" />} />
          <KpiCard label="Avg Order Value" value={formatINR(avgOrder)} accent="#C8302A" />
          <KpiCard label="Open (New+Proc)" value={String((statusCounts.NEW || 0) + (statusCounts.PROCESSING || 0))} accent="#D4859B" />
        </div>

        {/* Pipeline status bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'].map((s) => {
                const c = statusCounts[s] || 0
                const pct = orders.length > 0 ? (c / orders.length) * 100 : 0
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(status === s ? 'ALL' : s)}
                    className={`arch-card p-3 text-left transition-all ${status === s ? 'border-foreground' : ''}`}
                  >
                    <StatusPill status={s} />
                    <div className="font-display text-xl mt-2">{c}</div>
                    <div className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Channel velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Channel Velocity
            </CardTitle>
            <CardDescription className="text-xs">Order volume and revenue by sales channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {channelStats.map(([ch, s]) => (
                <button
                  key={ch}
                  onClick={() => setChannel(channel === ch ? 'ALL' : ch)}
                  className={`arch-card p-3 text-left transition-all ${channel === ch ? 'border-foreground' : ''}`}
                >
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground">{ch}</div>
                  <div className="font-display text-xl mt-1">{s.count}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{formatINR(s.revenue)}</div>
                  {s.stuck > 0 && (
                    <div className="mt-1.5 text-[10px] text-agni flex items-center gap-1">
                      <AlertOctagon className="h-3 w-3" /> {s.stuck} stuck 3d+
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by order # or customer…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Channels</SelectItem>
              <SelectItem value="D2C">D2C</SelectItem>
              <SelectItem value="RETAIL">Retail</SelectItem>
              <SelectItem value="WHOLESALE">Wholesale</SelectItem>
              <SelectItem value="POPUP">Pop-up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders table + Top cities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base">Recent Orders</CardTitle>
              <CardDescription className="text-xs">{filtered.length} orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="text-[10px] tracking-wider uppercase">Order</TableHead>
                      <TableHead className="text-[10px] tracking-wider uppercase">Customer</TableHead>
                      <TableHead className="text-[10px] tracking-wider uppercase">Channel</TableHead>
                      <TableHead className="text-[10px] tracking-wider uppercase text-right">Total</TableHead>
                      <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                      <TableHead className="text-[10px] tracking-wider uppercase">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelected(o)}
                      >
                        <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{o.customerName}</div>
                          <div className="text-[10px] text-muted-foreground">{o.customerCity}</div>
                        </TableCell>
                        <TableCell className="text-xs">{o.channel}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatINRFull(o.total)}</TableCell>
                        <TableCell><StatusPill status={o.status} /></TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{timeAgo(o.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Top Cities
              </CardTitle>
              <CardDescription className="text-xs">Customer locations by revenue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cityStats.map(([city, s]) => {
                const max = cityStats[0]?.[1].revenue || 1
                const pct = (s.revenue / max) * 100
                return (
                  <div key={city}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{city}</span>
                      <span className="font-mono text-muted-foreground">{formatINR(s.revenue)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-neel rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.count} orders</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={selected.status} />
                  <StatusPill status={selected.paymentStatus} />
                </div>
                <DialogTitle className="font-display text-2xl tracking-tight font-mono">
                  {selected.orderNumber}
                </DialogTitle>
                <DialogDescription>{selected.customerName} · {selected.customerCity}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <Detail label="Channel" value={selected.channel} />
                <Detail label="Items" value={String(selected.itemsCount)} />
                <Detail label="Order Date" value={new Date(selected.createdAt).toLocaleString()} />
                <Detail label="Total" value={formatINRFull(selected.total)} />
              </div>
              <div className="py-2">
                <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Customer</div>
                <div className="text-sm">{selected.customerName}</div>
                <div className="text-xs text-muted-foreground">{selected.customerEmail}</div>
              </div>
              <div className="py-2">
                <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Items</div>
                <div className="space-y-2">
                  {selected.items?.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <ColorDot color={it.product.color} size={10} />
                        <div>
                          <div className="font-medium">{it.product.name}</div>
                          <div className="text-[10px] text-muted-foreground">{it.product.sku} · {it.product.house}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{formatINRFull(it.price)} × {it.quantity}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{formatINRFull(it.price * it.quantity)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-wider uppercase text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 font-medium">{value}</div>
    </div>
  )
}
