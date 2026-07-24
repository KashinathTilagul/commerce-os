'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  TrendingDown, TrendingUp, Target, AlertCircle, Package, 
  RefreshCw, ChevronDown, ChevronUp, ExternalLink, Bell,
  Search, BarChart3, ShoppingCart, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface IntelligenceData {
  summary: {
    alertsCount: number
    totalProducts: number
    totalCompetitors: number
    priceChangesToday: number
    avgDiscount: number
  }
  recentAlerts: Array<{
    id: string
    alertType: string
    oldPrice: number
    newPrice: number
    changePercent: number
    createdAt: string
    acknowledged: boolean
    product: {
      id: string
      name: string
      url: string
      imageUrl?: string
      ourSku?: string
      competitor: { id: string; name: string; color: string }
    }
  }>
  topPriceDrops: any[]
  topPriceIncreases: any[]
  competitorInsights: Array<{
    id: string
    name: string
    domain: string
    color: string
    productsCount: number
    avgPrice: number
    inStockRate: number
  }>
  searchResults: any[]
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export function CompetitiveIntelligence() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAlerts, setShowAlerts] = useState(true)

  const { data, isLoading, refetch } = useQuery<IntelligenceData>({
    queryKey: ['competitive-intelligence', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      const r = await fetch(`/api/scrape/intelligence?${params}`)
      if (!r.ok) throw new Error('Failed to fetch intelligence')
      return r.json()
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  })

  const acknowledgeAlert = async (alertId: string) => {
    await fetch('/api/scrape/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alertId, acknowledged: true }),
    })
    refetch()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-red-950/30 to-transparent border-red-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Price Alerts</span>
              <Bell className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500">{data.summary.alertsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.summary.priceChangesToday} today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Products Tracked</span>
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.summary.totalCompetitors} competitors
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Avg Discount</span>
              <TrendingDown className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">
              {data.summary.avgDiscount.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across platforms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Sync Status</span>
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products, brands, SKUs..."
          className="pl-10"
        />
      </div>

      {/* Recent Alerts */}
      {data.recentAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Price Alerts
                <Badge variant="destructive">{data.recentAlerts.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAlerts(!showAlerts)}>
                {showAlerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="pt-0 space-y-2">
                  {data.recentAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {alert.alertType === 'price_drop' ? (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium truncate max-w-[200px]">
                            {alert.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge 
                              style={{ backgroundColor: alert.product.competitor.color }}
                              className="text-white text-[10px]"
                            >
                              {alert.product.competitor.name}
                            </Badge>
                            <span>
                              ₹{alert.oldPrice?.toFixed(0)} → ₹{alert.newPrice?.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={alert.alertType === 'price_drop' ? 'default' : 'secondary'}
                          className={alert.alertType === 'price_drop' ? 'bg-green-900 text-green-100' : ''}
                        >
                          {alert.changePercent > 0 ? '+' : ''}{alert.changePercent?.toFixed(1)}%
                        </Badge>
                        <a 
                          href={alert.product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          ✓
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Competitor Insights */}
      <div className="grid grid-cols-2 gap-3">
        {data.competitorInsights.map((comp) => (
          <Card key={comp.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: comp.color }}
                />
                <span className="font-medium">{comp.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Products</div>
                  <div className="font-medium">{comp.productsCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg Price</div>
                  <div className="font-medium">₹{comp.avgPrice.toFixed(0)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">In Stock</div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${comp.inStockRate}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {comp.inStockRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Price Changes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Price Drops */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-500">
              <TrendingDown className="w-4 h-4" />
              Biggest Drops
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {data.topPriceDrops.slice(0, 3).map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[150px]">{alert.product.name}</span>
                <Badge className="bg-green-900 text-green-100">
                  {alert.changePercent?.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Increases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-500">
              <TrendingUp className="w-4 h-4" />
              Biggest Increases
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {data.topPriceIncreases.slice(0, 3).map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[150px]">{alert.product.name}</span>
                <Badge variant="secondary">
                  +{alert.changePercent?.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
