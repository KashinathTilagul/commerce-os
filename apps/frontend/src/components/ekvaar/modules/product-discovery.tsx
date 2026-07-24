'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Search, Plus, Loader2, ExternalLink, Trash2, Link2, 
  ShoppingCart, Store, AlertCircle, Check, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Competitor {
  id: string
  name: string
  domain: string
  color: string
  active: boolean
}

interface DiscoveredProduct {
  name: string
  url: string
  price: number
  mrp: number
  discount: number
  imageUrl?: string
  brand?: string
  inStock: boolean
}

export function ProductDiscovery({ competitorId, onProductAdded }: { 
  competitorId?: string
  onProductAdded?: () => void 
}) {
  const [searchUrl, setSearchUrl] = useState('')
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitorId || '')
  const [addingUrls, setAddingUrls] = useState<Set<string>>(new Set())

  const { data: competitors } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const r = await fetch('/api/scrape/competitors')
      if (!r.ok) throw new Error('Failed to fetch competitors')
      const data = await r.json()
      return data.competitors as Competitor[]
    },
  })

  const discoveryMutation = useMutation({
    mutationFn: async ({ competitorId, searchUrl }: { competitorId: string; searchUrl: string }) => {
      const r = await fetch('/api/scrape/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId,
          type: 'discovery',
          url: searchUrl,
        }),
      })
      if (!r.ok) throw new Error('Failed to start discovery')
      return r.json()
    },
  })

  const addProductMutation = useMutation({
    mutationFn: async (product: DiscoveredProduct) => {
      const r = await fetch('/api/scrape/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: selectedCompetitor,
          ...product,
        }),
      })
      if (!r.ok) throw new Error('Failed to add product')
      return r.json()
    },
    onSuccess: () => {
      onProductAdded?.()
    },
  })

  const handleDiscover = () => {
    if (!selectedCompetitor || !searchUrl) return
    discoveryMutation.mutate({ competitorId: selectedCompetitor, searchUrl })
  }

  const handleAddProduct = async (product: DiscoveredProduct) => {
    setAddingUrls(prev => new Set(prev).add(product.url))
    try {
      await addProductMutation.mutateAsync(product)
    } finally {
      setAddingUrls(prev => {
        const next = new Set(prev)
        next.delete(product.url)
        return next
      })
    }
  }

  const discoveredProducts = discoveryMutation.data?.products || []

  return (
    <div className="space-y-4">
      {/* Competitor Selection */}
      {!competitorId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Competitor</label>
          <div className="grid grid-cols-5 gap-2">
            {competitors?.filter(c => c.active).map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompetitor(comp.id)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedCompetitor === comp.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: comp.color }}
                />
                <div className="text-xs text-center truncate">{comp.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Discovery URL</label>
        <div className="text-xs text-muted-foreground mb-2">
          Paste a category or search URL from the competitor's site
        </div>
        <div className="flex gap-2">
          <Input
            value={searchUrl}
            onChange={(e) => setSearchUrl(e.target.value)}
            placeholder="https://www.myntra.com/jeans?filter=..."
            className="flex-1"
          />
          <Button
            onClick={handleDiscover}
            disabled={!selectedCompetitor || !searchUrl || discoveryMutation.isPending}
          >
            {discoveryMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Discover
          </Button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {discoveryMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Discovering products...</span>
          </motion.div>
        )}

        {discoveredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {discoveredProducts.length} products found
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  discoveredProducts.forEach(p => handleAddProduct(p))
                }}
              >
                Add All
              </Button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {discoveredProducts.map((product: DiscoveredProduct, i: number) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Image */}
                    {product.imageUrl && (
                      <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {product.brand && <span>{product.brand}</span>}
                        {product.discount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {product.discount}% off
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-sm">₹{product.price}</span>
                        {product.mrp > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{product.mrp}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddProduct(product)}
                        disabled={addingUrls.has(product.url)}
                      >
                        {addingUrls.has(product.url) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {discoveryMutation.isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to discover products. Try again.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
