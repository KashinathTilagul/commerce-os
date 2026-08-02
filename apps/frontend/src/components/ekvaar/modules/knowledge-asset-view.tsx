'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Search, Filter, Box } from 'lucide-react'
import { PageHeader, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatINR } from '@/lib/ekvaar'

export function KnowledgeAssetView() {
  const [category, setCategory] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const { data: assets = [], isLoading } = useQuery<any[]>({
    queryKey: ['products', category, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category !== 'ALL') params.set('category', category)
      if (status !== 'ALL') params.set('status', status)
      const r = await fetch(`/api/products?${params}`)
      const json = await r.json()
      return Array.isArray(json) ? json : []
    },
  })

  // Dynamically extract categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    assets.forEach(a => {
      if (a.category) cats.add(a.category)
      // Fallback for old data where 'house' was used instead of 'category'
      if (a.house) cats.add(a.house)
    })
    return Array.from(cats).sort()
  }, [assets])

  const filtered = useMemo(() => {
    return assets.filter((p) => {
      const itemCategory = p.category || p.house
      if (category !== 'ALL' && itemCategory !== category) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [assets, category, search])

  // Stats by category
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; stock: number }> = {}
    for (const c of allCategories) {
      map[c] = { count: 0, stock: 0 }
    }
    for (const p of assets) {
      const cat = p.category || p.house || 'Uncategorized'
      if (!map[cat]) map[cat] = { count: 0, stock: 0 }
      map[cat].count++
      map[cat].stock += p.stock || 0
    }
    return map
  }, [assets, allCategories])

  return (
    <div>
      <div className="px-4 lg:px-8 py-8 space-y-8">
        {/* Category navigation cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setCategory('ALL')}
            className={`arch-card p-4 text-left transition-all ${category === 'ALL' ? 'border-foreground' : ''}`}
          >
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground">All Assets</div>
            <div className="font-display text-2xl mt-1">{assets.length}</div>
            <div className="text-[10px] text-muted-foreground mt-1">total pieces</div>
          </button>
          {allCategories.map((cat) => {
            const stats = categoryStats[cat]
            const active = category === cat
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`arch-card p-4 text-left transition-all ${active ? 'border-foreground' : ''}`}
              >
                <div className="text-[10px] tracking-wider uppercase text-muted-foreground truncate">{cat}</div>
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
            {filtered.map((p) => {
              const itemCat = p.category || p.house || 'Uncategorized'
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="arch-card overflow-hidden text-left group hover:border-foreground/40"
                >
                  <div className="aspect-[4/5] bg-muted/30 relative flex items-center justify-center border-b border-border transition-colors group-hover:bg-muted/50">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Box className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] tracking-wider uppercase text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                        {itemCat}
                      </span>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="font-display tracking-tight leading-tight">{p.name}</div>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-muted-foreground font-mono">{p.sku}</span>
                      <span className="font-medium">{formatINR(p.price)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            
            {filtered.length === 0 && !isLoading && (
              <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg">
                <Box className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-display text-lg tracking-tight mb-1">No assets found</h3>
                <p className="text-sm text-muted-foreground">Adjust filters or search query to find knowledge assets.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
