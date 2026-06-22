'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Search, Plus, ArrowUpRight, Filter, Package2 } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'
import { PageHeader, HouseBadge, ColorDot, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatINR, formatINRFull, EKVAAR_HOUSES, EKVAAR_COLORS } from '@/lib/ekvaar'

export function HouseOfOriginals() {
  const [house, setHouse] = useState('ALL')
  const [color, setColor] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['products', house, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (house !== 'ALL') params.set('house', house)
      if (status !== 'ALL') params.set('status', status)
      const r = await fetch(`/api/products?${params}`)
      return r.json()
    },
  })

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (color !== 'ALL' && p.color !== color) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, color, search])

  // Stats by house
  const houseStats = useMemo(() => {
    const map: Record<string, { count: number; stock: number; revenue: number }> = {}
    for (const h of EKVAAR_HOUSES) {
      map[h.name] = { count: 0, stock: 0, revenue: 0 }
    }
    for (const p of products) {
      if (!map[p.house]) map[p.house] = { count: 0, stock: 0, revenue: 0 }
      map[p.house].count++
      map[p.house].stock += p.stock
      map[p.house].revenue += p.price * (p.stock > 0 ? 50 : 0) // rough
    }
    return map
  }, [products])

  return (
    <div>
      <PageHeader
        eyebrow="House of Originals"
        title="Catalog · Five Houses"
        description="One House with five structured categories. Categories must never blur. Each piece is built for permanence — emotionally durable, visually long-lasting, culturally intelligent, repeat wearable."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => toast.info('New Original', 'Product creation form would open here')}>
            <Plus className="h-3.5 w-3.5" /> New Original
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-8">
        {/* House navigation cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setHouse('ALL')}
            className={`arch-card p-4 text-left transition-all ${house === 'ALL' ? 'border-foreground' : ''}`}
          >
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground">All Houses</div>
            <div className="font-display text-2xl mt-1">{products.length}</div>
            <div className="text-[10px] text-muted-foreground mt-1">total pieces</div>
          </button>
          {EKVAAR_HOUSES.map((h) => {
            const stats = houseStats[h.name]
            const active = house === h.name
            return (
              <button
                key={h.name}
                onClick={() => setHouse(h.name)}
                className={`arch-card p-4 text-left transition-all ${active ? 'border-foreground' : ''}`}
              >
                <HouseBadge house={h.name} />
                <div className="font-display text-2xl mt-2">{stats?.count || 0}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{stats?.stock || 0} in stock</div>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Colors</SelectItem>
              {EKVAAR_COLORS.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="RESTOCKING">Restocking</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="arch-card overflow-hidden text-left group hover:border-foreground/40"
              >
                <ProductVisual color={p.color} house={p.house} name={p.name} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <HouseBadge house={p.house} />
                    <StatusPill status={p.status} />
                  </div>
                  <div className="font-display text-base tracking-tight">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.sku}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <ColorDot color={p.color} size={10} />
                      <span className="text-xs text-muted-foreground">{p.color}</span>
                    </div>
                    <div className="font-display text-base">{formatINR(p.price)}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{p.material.split(' ')[0]} · {p.material.split(' ').slice(-1)[0]}</span>
                    <span className={p.stock <= p.reorderAt ? 'text-agni font-medium' : ''}>{p.stock} in stock</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <Package2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">No pieces match these filters.</div>
          </div>
        )}
      </div>

      {/* Product detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <HouseBadge house={selected.house} />
                  <StatusPill status={selected.status} />
                </div>
                <DialogTitle className="font-display text-2xl tracking-tight">{selected.name}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{selected.sku}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <Detail label="Price" value={formatINRFull(selected.price)} />
                <Detail label="Unit Cost" value={formatINRFull(selected.cost)} />
                <Detail label="Margin" value={`${Math.round(((selected.price - selected.cost) / selected.price) * 100)}%`} />
                <Detail label="Stock" value={`${selected.stock} units`} />
                <Detail label="Reorder At" value={`${selected.reorderAt} units`} />
                <Detail label="Color" value={selected.color} />
                <Detail label="Category" value={selected.category} />
                <Detail label="Material" value={selected.material} />
              </div>
              <div className="py-2">
                <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Description</div>
                <p className="text-sm leading-relaxed">{selected.description}</p>
              </div>
              <div className="py-2">
                <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Color Identity</div>
                <div className="flex items-center gap-3">
                  <ColorDot color={selected.color} size={20} />
                  <div>
                    <div className="text-sm font-medium">{selected.color}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {EKVAAR_COLORS.find((c) => c.name === selected.color)?.meaning}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Edit Piece</Button>
                <Button className="gap-1.5">
                  View Sales <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </DialogFooter>
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

function ProductVisual({ color, house, name }: { color: string; house: string; name: string }) {
  const map: Record<string, string> = {
    'Noor Black': '#0A0A0A',
    'Rui White': '#F5F1EA',
    'Agni Red': '#C8302A',
    'Neel Blue': '#1F3A5F',
    'Arav Green': '#2F4F3A',
    'Gulabi Pink': '#D4859B',
  }
  const hex = map[color] || '#888'
  const isLight = color === 'Rui White'

  return (
    <div
      className="aspect-[4/5] relative overflow-hidden flex items-center justify-center"
      style={{ background: hex }}
    >
      <div
        className={`absolute inset-0 grain ${isLight ? 'opacity-100' : 'opacity-100'}`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${hex} 0%, ${hex} 60%, ${shade(hex, -20)} 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${shade(hex, 15)} 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${shade(hex, -25)} 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute top-3 left-3 text-[9px] tracking-[0.25em] uppercase opacity-50"
        style={{ color: isLight ? '#0A0A0A' : '#F5F1EA' }}
      >
        {house}
      </div>
      <div
        className="absolute bottom-3 right-3 text-[9px] tracking-[0.25em] uppercase opacity-50"
        style={{ color: isLight ? '#0A0A0A' : '#F5F1EA' }}
      >
        EKVAAR
      </div>
      {/* House sigil */}
      <HouseSigil house={house} color={isLight ? '#0A0A0A' : '#F5F1EA'} />
    </div>
  )
}

function HouseSigil({ house, color }: { house: string; color: string }) {
  const sigils: Record<string, React.ReactNode> = {
    Solids: <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: color, opacity: 0.6 }} />,
    Layers: (
      <div className="flex flex-col gap-1.5">
        <div className="w-16 h-3" style={{ background: color, opacity: 0.8 }} />
        <div className="w-16 h-3" style={{ background: color, opacity: 0.5 }} />
        <div className="w-16 h-3" style={{ background: color, opacity: 0.3 }} />
      </div>
    ),
    Street: (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="w-7 h-7" style={{ background: color, opacity: 0.8 }} />
        <div className="w-7 h-7" style={{ background: color, opacity: 0.3 }} />
        <div className="w-7 h-7" style={{ background: color, opacity: 0.3 }} />
        <div className="w-7 h-7" style={{ background: color, opacity: 0.8 }} />
      </div>
    ),
    Luxe: (
      <div className="w-16 h-16 border-2 rotate-45" style={{ borderColor: color, opacity: 0.7 }} />
    ),
    Origins: (
      <div className="w-16 h-16 border-2 flex items-center justify-center" style={{ borderColor: color, opacity: 0.7 }}>
        <div className="w-8 h-8" style={{ background: color, opacity: 0.4 }} />
      </div>
    ),
  }
  return <div className="relative z-10">{sigils[house]}</div>
}

function shade(hex: string, amt: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + amt
  let g = ((num >> 8) & 0xff) + amt
  let b = (num & 0xff) + amt
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
