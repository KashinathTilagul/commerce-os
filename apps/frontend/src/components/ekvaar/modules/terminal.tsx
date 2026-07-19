'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Terminal, Activity, Zap, AlertCircle, Info, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSubscription } from '@/lib/cpu-websocket'

const SEVERITY_META: Record<string, { color: string; icon: any; prefix: string }> = {
  INFO: { color: '#1F3A5F', icon: Info, prefix: '›' },
  WARN: { color: '#D4859B', icon: AlertCircle, prefix: '!' },
  ERROR: { color: '#C8302A', icon: AlertCircle, prefix: '✕' },
  CRITICAL: { color: '#C8302A', icon: Zap, prefix: '⚡' },
}

export function TerminalModule() {
  const { data: events = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const r = await fetch('/api/events')
      if (!r.ok) throw new Error('Failed to fetch events')
      return r.json()
    },
    staleTime: 30000,
  })

  useAppSubscription('events')

  const [filter, setFilter] = useState<string>('ALL')
  const logRef = useRef<HTMLDivElement>(null)

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.severity === filter)

  const counts = {
    INFO: events.filter((e) => e.severity === 'INFO').length,
    WARN: events.filter((e) => e.severity === 'WARN').length,
    ERROR: events.filter((e) => e.severity === 'ERROR').length,
    CRITICAL: events.filter((e) => e.severity === 'CRITICAL').length,
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events])

  return (
    <div>
      <PageHeader
        eyebrow="Terminal · Live System Stream"
        title="Heartbeat & Event Ledger"
        description="Every action — issue status changes, budget thresholds, agent heartbeats, approval requests — is published to the Event Bus. This is the append-only audit trail. Watch the digital C-suite think and communicate in real-time."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
            Live
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {error && (
          <Card className="border-agni/40 bg-agni/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-agni" />
              <div>
                <div className="font-medium text-sm">Unable to load event stream</div>
                <div className="text-xs text-muted-foreground">Check your connection and try again.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Events" value={isLoading ? '—' : String(events.length)} accent="#1F3A5F" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="Info" value={isLoading ? '—' : String(counts.INFO)} accent="#1F3A5F" icon={<Info className="h-4 w-4" />} />
          <KpiCard label="Warnings" value={isLoading ? '—' : String(counts.WARN)} accent="#D4859B" icon={<AlertCircle className="h-4 w-4" />} />
          <KpiCard label="Critical" value={isLoading ? '—' : String(counts.CRITICAL + counts.ERROR)} accent="#C8302A" icon={<Zap className="h-4 w-4" />} />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          {['ALL', 'INFO', 'WARN', 'CRITICAL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[10px] tracking-wider uppercase rounded-sm border transition-colors ${
                filter === f
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto text-[10px] text-muted-foreground">
            Showing {filtered.length} of {events.length}
          </div>
        </div>

        {/* Terminal log */}
        <Card className="bg-noor text-rui border-0 overflow-hidden">
          <CardHeader className="pb-2 border-b border-rui/10">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display tracking-tight flex items-center gap-2 text-base text-rui">
                <Terminal className="h-4 w-4" /> ekvaar@os ~ event-ledger
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-agni" />
                <div className="h-2 w-2 rounded-full bg-gulabi" />
                <div className="h-2 w-2 rounded-full bg-arav animate-pulse-soft" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-[560px] p-4 font-mono text-xs space-y-1.5" style={{ background: '#0A0A0A' }}>
                <div className="text-rui/40 mb-3">
                  <div>$ ekvaar-os --start-event-ledger</div>
                  <div className="text-rui/30">Connecting...</div>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1">
                    <div className="h-3 w-20 bg-rui/20 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-rui/20 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-rui/20 rounded animate-pulse flex-1" />
                  </div>
                ))}
              </div>
            ) : (
            <div
              ref={logRef}
              className="h-[560px] overflow-y-auto p-4 font-mono text-xs space-y-1.5"
              style={{ background: '#0A0A0A' }}
            >
              {/* Boot line */}
              <div className="text-rui/40 mb-3">
                <div>$ ekvaar-os --start-event-ledger</div>
                <div className="text-arav">✓ Connected to Heartbeat Engine · 12 agents registered</div>
                <div className="text-rui/40">→ Streaming live events…</div>
                <div className="text-rui/30">─────────────────────────────────────────────</div>
              </div>

              <AnimatePresence initial={false}>
                {filtered.map((e, i) => {
                  const meta = SEVERITY_META[e.severity] || SEVERITY_META.INFO
                  const Icon = meta.icon
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 group hover:bg-rui/5 px-2 py-1 rounded"
                    >
                      <span className="text-rui/30 flex-shrink-0 w-20">
                        {new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <Icon className="h-3 w-3 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                      <span
                        className="flex-shrink-0 font-bold w-32 truncate"
                        style={{ color: meta.color }}
                      >
                        [{e.type}]
                      </span>
                      <span className="flex-shrink-0 text-gulabi/80">
                        {e.actorName}:
                      </span>
                      <span className="text-rui/90 flex-1">{e.summary}</span>
                    </motion.div>
                  )
                }).reverse()}
              </AnimatePresence>

              {/* Live cursor */}
              <div className="text-rui/40 mt-2 flex items-center gap-1">
                <span>$</span>
                <span className="inline-block w-2 h-3.5 bg-rui/60 animate-pulse-soft" />
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* CPU context window */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Agent CPU Context
            </CardTitle>
            <CardDescription className="text-xs">
              Live token consumption across the digital C-suite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <AgentCpuGrid />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Client-only CPU grid — uses useState to avoid SSR hydration mismatch from Math.random
function AgentCpuGrid() {
  const [loads, setLoads] = useState<number[] | null>(null)

  useEffect(() => {
    // Generate on client only — defers to next tick to avoid lint warning
    const raf = requestAnimationFrame(() => {
      const initial = Array.from({ length: 6 }, () => 20 + Math.floor(Math.random() * 70))
      setLoads(initial)
    })
    const t = setInterval(() => {
      setLoads((prev) => {
        if (!prev) return prev
        return prev.map((l) => {
          const delta = Math.floor(Math.random() * 20) - 10
          return Math.max(15, Math.min(95, l + delta))
        })
      })
    }, 3000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(t)
    }
  }, [])

  // Stable placeholder during SSR and first paint — 6 zeros
  const display = loads ?? [0, 0, 0, 0, 0, 0]

  return (
    <>
      {display.map((load, i) => (
        <div key={i} className="p-3 border border-border rounded-md">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">
            Agent {i + 1}
          </div>
          <div className="font-display text-lg mt-1">{loads ? `${load}%` : '—'}</div>
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-700 ${load > 80 ? 'bg-agni' : load > 60 ? 'bg-gulabi' : 'bg-arav'}`}
              style={{ width: `${load}%` }}
            />
          </div>
        </div>
      ))}
    </>
  )
}
