'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Shield, Lock } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BOOKMARKS = [
  { name: 'EKVAAR Journal', url: 'https://ekvaar.com/journal', icon: '📖' },
  { name: 'Shopify Admin', url: 'https://admin.shopify.com', icon: '🛍️' },
  { name: 'Stripe Dashboard', url: 'https://dashboard.stripe.com', icon: '💳' },
  { name: 'Brand Book', url: 'https://ekvaar.com/brand', icon: '🎨' },
  { name: 'Founder Notes', url: 'https://ekvaar.com/notes', icon: '✍️' },
  { name: 'Agent Console', url: 'http://localhost:8000', icon: '🤖' },
]

export function Browser() {
  const [url, setUrl] = useState('ekvaar://home')
  const [inputUrl, setInputUrl] = useState('ekvaar://home')
  const [history, setHistory] = useState<string[]>(['ekvaar://home'])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [loading, setLoading] = useState(false)

  const navigate = (target: string) => {
    setUrl(target)
    setInputUrl(target)
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(target)
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
    setLoading(true)
    setTimeout(() => setLoading(false), 600)
  }

  const back = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1)
      setUrl(history[historyIdx - 1])
      setInputUrl(history[historyIdx - 1])
    }
  }

  const forward = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1)
      setUrl(history[historyIdx + 1])
      setInputUrl(history[historyIdx + 1])
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Browser"
        title="Internal Browser"
        description="Embedded browser module for accessing internal services, dashboards, and external resources."
      />

      <div className="px-4 lg:px-8 py-6 space-y-4">
        {/* Toolbar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={back} disabled={historyIdx === 0}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={forward} disabled={historyIdx >= history.length - 1}>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(url)}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('ekvaar://home')}>
                <Home className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-xs font-mono"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(inputUrl) }}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-arav" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content area */}
        <Card className="min-h-[400px]">
          <CardContent className="p-0">
            {url === 'ekvaar://home' ? (
              <BrowserHome onNavigate={navigate} bookmarks={BOOKMARKS} />
            ) : (
              <div className="p-12 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <RotateCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Loading {url}…</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Shield className="h-12 w-12 text-muted-foreground opacity-40" />
                    <div className="text-sm font-medium">Sandboxed View</div>
                    <div className="text-xs text-muted-foreground max-w-md">
                      External sites are sandboxed for security. The embedded view of {url} would render here in a production environment with proper CORS and CSP configuration.
                    </div>
                    <div className="mt-4 p-4 bg-muted rounded-md max-w-md text-left">
                      <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Resolved URL</div>
                      <div className="text-xs font-mono break-all">{url}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BrowserHome({ onNavigate, bookmarks }: { onNavigate: (url: string) => void; bookmarks: any[] }) {
  return (
    <div className="p-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="font-display text-4xl tracking-tighter mb-2">EKVAAR</div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Internal Browser</div>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-11 h-12 text-sm rounded-full"
          placeholder="Search the web or enter address…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = (e.target as HTMLInputElement).value
              if (v) onNavigate(v.startsWith('http') ? v : `https://${v}`)
            }
          }}
        />
      </div>

      {/* Bookmarks */}
      <div className="max-w-2xl mx-auto">
        <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3 text-center">Favorites</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {bookmarks.map((b) => (
            <button
              key={b.name}
              onClick={() => onNavigate(b.url)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xl">
                {b.icon}
              </div>
              <div className="text-[10px] text-center leading-tight">{b.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Color stripes */}
      <div className="flex items-center justify-center gap-1 mt-12">
        <div className="h-0.5 w-8" style={{ background: '#C8302A' }} />
        <div className="h-0.5 w-8" style={{ background: '#1F3A5F' }} />
        <div className="h-0.5 w-8" style={{ background: '#2F4F3A' }} />
        <div className="h-0.5 w-8" style={{ background: '#D4859B' }} />
        <div className="h-0.5 w-8" style={{ background: '#F5F1EA' }} />
      </div>
    </div>
  )
}
