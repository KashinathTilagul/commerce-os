'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Lock, Globe, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BOOKMARKS = [
  { name: 'EKVAAR', url: 'https://ekvaar.com', icon: '🏮' },
  { name: 'Shopify', url: 'https://admin.shopify.com', icon: '🛍️' },
  { name: 'Stripe', url: 'https://dashboard.stripe.com', icon: '💳' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org', icon: '📖' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
]

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'about:blank'
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  // looks like a domain (has a dot, no spaces) → treat as URL
  if (!trimmed.includes(' ') && trimmed.includes('.')) return `https://${trimmed}`
  // else Google search
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

export function Browser() {
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isHome = url === ''

  const navigate = (raw: string) => {
    const target = normalizeUrl(raw)
    setUrl(target)
    setInputUrl(target)
    setIframeError(false)
    setLoading(true)
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(target)
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
  }

  const goBack = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1]
      setHistoryIdx(historyIdx - 1)
      setUrl(prev)
      setInputUrl(prev)
      setIframeError(false)
      setLoading(true)
    }
  }

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1]
      setHistoryIdx(historyIdx + 1)
      setUrl(next)
      setInputUrl(next)
      setIframeError(false)
      setLoading(true)
    }
  }

  const reload = () => {
    if (!url) return
    setIframeError(false)
    setLoading(true)
    if (iframeRef.current) {
      iframeRef.current.src = url
    }
  }

  const goHome = () => {
    setUrl('')
    setInputUrl('')
    setIframeError(false)
  }

  const isSecure = url.startsWith('https://')

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 480 }}>
      <PageHeader
        eyebrow="Browser"
        title="Internal Browser"
        description="Browse the web or internal services directly."
      />

      <div className="flex flex-col flex-1 px-4 lg:px-8 pb-6 gap-3">
        {/* Toolbar */}
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-border"
          style={{ background: 'var(--card)' }}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goBack} disabled={historyIdx <= 0}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goForward} disabled={historyIdx >= history.length - 1}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={reload} disabled={isHome}>
            <RotateCw className={`h-4 w-4 ${loading && !isHome ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goHome}>
            <Home className="h-4 w-4" />
          </Button>

          {/* Address bar */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isHome
                ? <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                : isSecure
                  ? <Lock className="h-3 w-3 text-emerald-500" />
                  : <AlertTriangle className="h-3 w-3 text-amber-500" />
              }
            </div>
            <Input
              className="pl-8 pr-3 h-8 text-xs font-mono rounded-lg"
              value={inputUrl}
              placeholder="Search or enter address…"
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(inputUrl)
              }}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border relative" style={{ minHeight: 400 }}>
          {isHome ? (
            <BrowserHome onNavigate={navigate} />
          ) : (
            <>
              {iframeError ? (
                <BlockedPage url={url} onSearchFallback={() => navigate(`https://www.google.com/search?q=${encodeURIComponent(url)}`)} />
              ) : (
                <iframe
                  ref={iframeRef}
                  src={url}
                  className="w-full h-full border-0"
                  style={{ minHeight: 400 }}
                  title="Browser"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setIframeError(true) }}
                />
              )}
              {loading && !iframeError && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500 animate-pulse" />
              )}
            </>
          )}
        </div>

        {/* X-Frame-Options notice — shown when site blocks embedding */}
        {iframeError && (
          <p className="text-[10px] text-muted-foreground text-center">
            Some sites block embedding (X-Frame-Options). Try opening in a real browser tab.
          </p>
        )}
      </div>
    </div>
  )
}

function BrowserHome({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [q, setQ] = useState('')

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 gap-8"
      style={{ background: 'var(--background)' }}>
      {/* Logo */}
      <div className="text-center">
        <div className="font-display text-4xl tracking-tighter mb-1">EKVAAR</div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Browser</div>
      </div>

      {/* Search */}
      <div className="w-full max-w-md relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-11 h-12 text-sm rounded-full"
          placeholder="Search or enter address…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) onNavigate(q.trim())
          }}
          autoFocus
        />
      </div>

      {/* Bookmarks */}
      <div className="w-full max-w-lg">
        <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3 text-center">Favorites</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {BOOKMARKS.map((b) => (
            <button
              key={b.name}
              onClick={() => onNavigate(b.url)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-xl shadow-sm">
                {b.icon}
              </div>
              <div className="text-[10px] text-center leading-tight text-muted-foreground">{b.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2">
        {['#C8302A', '#1F3A5F', '#2F4F3A', '#D4859B', '#F5F1EA'].map((c) => (
          <div key={c} className="h-0.5 w-8 rounded-full" style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

function BlockedPage({ url, onSearchFallback }: { url: string; onSearchFallback: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ background: 'var(--background)' }}>
      <AlertTriangle className="h-10 w-10 text-amber-500 opacity-80" />
      <div className="text-sm font-medium">Site blocked embedding</div>
      <div className="text-xs text-muted-foreground max-w-sm">
        <span className="font-mono break-all">{url}</span>
        <br /><br />
        This site uses X-Frame-Options or CSP to prevent being embedded in iframes — a common security measure.
      </div>
      <Button size="sm" variant="outline" onClick={onSearchFallback}>
        Search for it instead
      </Button>
    </div>
  )
}
