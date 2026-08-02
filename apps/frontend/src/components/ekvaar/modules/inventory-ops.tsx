'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Package, Truck, AlertTriangle, Factory, MapPin, Star, Clock, TrendingDown, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, HouseBadge, ColorDot, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { Input } from '@/components/ui/input'

export function InventoryOps() {
  const [search, setSearch] = useState('')
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products-all-ops'],
    queryFn: async () => {
      const r = await fetch('/api/products')
      if (!r.ok) throw new Error('Failed to fetch products')
      return r.json()
    },
  })

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const r = await fetch('/api/suppliers')
      if (!r.ok) throw new Error('Failed to fetch suppliers')
      return r.json()
    },
  })

  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === 'ACTIVE')
    const totalStock = activeProducts.reduce((s, p) => s + p.stock, 0)
    const totalValue = activeProducts.reduce((s, p) => s + p.stock * p.cost, 0)
    const lowStock = activeProducts.filter((p) => p.stock <= p.reorderAt)
    const restocking = activeProducts.filter((p) => p.status === 'RESTOCKING')
    const allCategories = new Set<string>()
    for (const p of activeProducts) {
      allCategories.add(p.category || p.house || 'Uncategorized')
    }

    const byHouse: Record<string, { stock: number; value: number; count: number; low: number }> = {}
    for (const cat of allCategories) byHouse[cat] = { stock: 0, value: 0, count: 0, low: 0 }

    for (const p of activeProducts) {
      const cat = p.category || p.house || 'Uncategorized'
      byHouse[cat].stock += p.stock
      byHouse[cat].value += p.stock * p.cost
      byHouse[cat].count++
      if (p.stock <= p.reorderAt) byHouse[cat].low++
    }

    const active = activeProducts.filter((p) => p.price > 0)
    const avgMarginPct = active.length
      ? active.reduce((s, p) => s + (p.price - p.cost) / p.price, 0) / active.length * 100
      : 0
    const marginWatch = [...active].sort((a, b) => (a.price - a.cost) / a.price - (b.price - b.cost) / b.price).slice(0, 8)

    return { totalStock, totalValue, lowStock, restocking, byHouse, allCategories: Array.from(allCategories).sort(), avgMarginPct, marginWatch }
  }, [products])

  const activeProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((p) => p.status === 'ACTIVE' && (!query || [p.name, p.sku, p.house, p.category, p.color].some(value => String(value || '').toLowerCase().includes(query))))
  }, [products, search])

  return (
    <div>
      <PageHeader
        eyebrow="Inventory & Operations"
        title="Manufacturing · Stock · Suppliers"
        description="Intentional manufacturing, ethical sourcing, controlled inventory, reduced waste, long-wear construction. The goal is structural permanence — not sustainability marketing."
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Units in Stock" value={String(stats.totalStock)} accent="#1F3A5F" icon={<Package className="h-4 w-4" />} />
          <KpiCard label="Inventory Value" value={formatINR(stats.totalValue)} accent="#2F4F3A" icon={<Factory className="h-4 w-4" />} />
          <KpiCard label="Avg Margin" value={`${stats.avgMarginPct.toFixed(0)}%`} accent="#8B7355" icon={<TrendingDown className="h-4 w-4" />} />
          <KpiCard label="Low Stock Alerts" value={String(stats.lowStock.length)} accent="#C8302A" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Active Suppliers" value={String(suppliers.filter((s) => s.status === 'ACTIVE').length)} accent="#D4859B" icon={<Truck className="h-4 w-4" />} />
        </div>

        {/* House inventory */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg tracking-tight">Inventory by House</h2>
            <span className="text-xs text-muted-foreground">Stock value at cost</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.allCategories.map((cat) => {
              const s = stats.byHouse[cat]
              if (!s) return null
              return (
                <Card key={cat}>
                  <CardContent className="p-5">
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm inline-block mb-2">
                      {cat}
                    </div>
                    <div className="font-display text-2xl mt-3">{s.stock}</div>
                    <div className="text-[10px] text-muted-foreground">units · {s.count} SKUs</div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Value</div>
                      <div className="font-mono text-sm mt-0.5">{formatINR(s.value)}</div>
                    </div>
                    {s.low > 0 && (
                      <div className="mt-3 text-[10px] text-agni flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {s.low} need restock
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Margin watch */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-agni" /> Margin Watch
            </CardTitle>
            <CardDescription className="text-xs">Lowest-margin SKUs — candidates for repricing or cost renegotiation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {stats.marginWatch.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No priced SKUs yet.</div>
              ) : (
                stats.marginWatch.map((p) => {
                  const marginPct = ((p.price - p.cost) / p.price) * 100
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                      <div className="flex items-center gap-3">
                        <ColorDot color={p.color} size={12} />
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.sku} · {formatINRFull(p.cost)} cost / {formatINRFull(p.price)} price</div>
                        </div>
                      </div>
                      <div className={`text-sm font-mono ${marginPct < 30 ? 'text-agni font-medium' : 'text-muted-foreground'}`}>
                        {marginPct.toFixed(0)}%
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restock queue + Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-agni" /> Restock Queue
              </CardTitle>
              <CardDescription className="text-xs">Items at or below reorder threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {stats.lowStock.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">All houses well stocked.</div>
                ) : (
                  stats.lowStock.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                      <div className="flex items-center gap-3">
                        <ColorDot color={p.color} size={12} />
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.sku} · {p.house}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-agni">{p.stock}</div>
                        <div className="text-[10px] text-muted-foreground">/ {p.reorderAt} reorder</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Suppliers
              </CardTitle>
              <CardDescription className="text-xs">Ethical sourcing network — flagged for low rating or long lead time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {[...suppliers]
                  .sort((a, b) => Number(b.rating < 3.5 || b.leadTime > 21) - Number(a.rating < 3.5 || a.leadTime > 21))
                  .map((s) => {
                    const flagged = s.status === 'ACTIVE' && (s.rating < 3.5 || s.leadTime > 21)
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {s.name}
                            {flagged && <AlertTriangle className="h-3 w-3 text-agni shrink-0" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <MapPin className="h-3 w-3" /> {s.city}
                            <span>·</span>
                            <span>{s.material}</span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className={`flex items-center gap-1 text-xs ${s.rating < 3.5 ? 'text-agni' : ''}`}>
                            <Star className="h-3 w-3 text-gulabi fill-gulabi" />
                            <span className="font-mono">{s.rating}</span>
                          </div>
                          <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${s.leadTime > 21 ? 'text-agni' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3" /> {s.leadTime}d
                          </div>
                        </div>
                        <div className="ml-3">
                          <StatusPill status={s.status} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full inventory table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Full Inventory Ledger</CardTitle>
            <CardDescription className="text-xs">{activeProducts.length} active SKUs · Draft and inactive listings excluded</CardDescription>
            <div className="relative mt-3 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, SKU, house..." className="h-9 pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="text-[10px] tracking-wider uppercase">SKU</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Product</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">House</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Color</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Stock</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Cost</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Margin</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Value</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeProducts.map((p) => {
                    const marginPct = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : null
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-[10px]">{p.sku}</TableCell>
                        <TableCell className="text-sm font-medium">{p.name}</TableCell>
                        <TableCell><HouseBadge house={p.house} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <ColorDot color={p.color} size={10} />
                            <span className="text-[10px]">{p.color}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${p.stock <= p.reorderAt ? 'text-agni font-medium' : ''}`}>
                          {p.stock}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatINRFull(p.cost)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${marginPct !== null && marginPct < 30 ? 'text-agni' : ''}`}>
                          {marginPct !== null ? `${marginPct.toFixed(0)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatINR(p.stock * p.cost)}</TableCell>
                        <TableCell><StatusPill status={p.status} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
