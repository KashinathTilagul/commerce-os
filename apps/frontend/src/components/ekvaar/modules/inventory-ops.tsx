'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Package, Truck, AlertTriangle, Factory, MapPin, Star, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, HouseBadge, ColorDot, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { formatINR, formatINRFull, EKVAAR_HOUSES, timeAgo } from '@/lib/ekvaar'

export function InventoryOps() {
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
    const totalStock = products.reduce((s, p) => s + p.stock, 0)
    const totalValue = products.reduce((s, p) => s + p.stock * p.cost, 0)
    const lowStock = products.filter((p) => p.stock <= p.reorderAt && p.status !== 'DRAFT')
    const restocking = products.filter((p) => p.status === 'RESTOCKING')
    const byHouse: Record<string, { stock: number; value: number; count: number; low: number }> = {}
    for (const h of EKVAAR_HOUSES) byHouse[h.name] = { stock: 0, value: 0, count: 0, low: 0 }
    for (const p of products) {
      if (!byHouse[p.house]) byHouse[p.house] = { stock: 0, value: 0, count: 0, low: 0 }
      byHouse[p.house].stock += p.stock
      byHouse[p.house].value += p.stock * p.cost
      byHouse[p.house].count++
      if (p.stock <= p.reorderAt && p.status !== 'DRAFT') byHouse[p.house].low++
    }
    return { totalStock, totalValue, lowStock, restocking, byHouse }
  }, [products])

  return (
    <div>
      <PageHeader
        eyebrow="Inventory & Operations"
        title="Manufacturing · Stock · Suppliers"
        description="EKVAAR rejects overproduction. Intentional manufacturing, ethical labor, controlled inventory, reduced waste, long-wear construction. The goal is structural permanence — not sustainability marketing."
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Units in Stock" value={String(stats.totalStock)} accent="#1F3A5F" icon={<Package className="h-4 w-4" />} />
          <KpiCard label="Inventory Value" value={formatINR(stats.totalValue)} accent="#2F4F3A" icon={<Factory className="h-4 w-4" />} />
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
            {EKVAAR_HOUSES.map((h) => {
              const s = stats.byHouse[h.name]
              if (!s) return null
              return (
                <Card key={h.name}>
                  <CardContent className="p-5">
                    <HouseBadge house={h.name} />
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
              <CardDescription className="text-xs">Ethical sourcing network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {suppliers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <MapPin className="h-3 w-3" /> {s.city}
                        <span>·</span>
                        <span>{s.material}</span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 text-gulabi fill-gulabi" />
                        <span className="font-mono">{s.rating}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {s.leadTime}d
                      </div>
                    </div>
                    <div className="ml-3">
                      <StatusPill status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full inventory table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Full Inventory Ledger</CardTitle>
            <CardDescription className="text-xs">{products.length} SKUs across 5 houses</CardDescription>
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
                    <TableHead className="text-[10px] tracking-wider uppercase text-right">Value</TableHead>
                    <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
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
                      <TableCell className="text-right font-mono text-xs">{formatINR(p.stock * p.cost)}</TableCell>
                      <TableCell><StatusPill status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
