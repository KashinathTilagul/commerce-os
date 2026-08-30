'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Activity, AlertTriangle, ChevronDown, ChevronRight, Info, Loader2, Search, ShieldCheck } from 'lucide-react'

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  INFO: <Info className="h-3.5 w-3.5 shrink-0 text-blue-400" />,
  WARN: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
  WARNING: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
  ERROR: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />,
  FAILED: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />,
  CRITICAL: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-red-500" />,
}

type LogEntry = {
  id: string
  kind: 'EVENT' | 'RUN'
  timestamp: string
  action: string
  status: string
  actor: { name: string; code: string; avatarColor?: string }
  summary: string
  issue?: { id: string; code: string; title: string; status: string; priority: string } | null
  task?: { id: string; code: string; title: string; status: string } | null
  details: Record<string, unknown>
  steps: Array<{ id: string; sequence: number; type: string; toolName?: string | null; status: string; startedAt: string; completedAt?: string | null; inputSummary?: string | null; outputSummary?: string | null; error?: string | null }>
}

const WINDOWS: Record<string, number> = { day: 1, week: 7, month: 30 }

export function ActivityFeed() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('ALL')
  const [work, setWork] = useState('ALL')
  const [window, setWindow] = useState('week')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data, isLoading } = useQuery<{ entries: LogEntry[] }>({
    queryKey: ['workforce-activity'],
    queryFn: async () => {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not load logs')
      return payload
    },
    refetchInterval: 60_000,
  })
  const entries = data?.entries || []
  const actions = useMemo(() => [...new Set(entries.map((entry) => entry.action))].sort(), [entries])
  const workItems = useMemo(() => {
    const items = new Map<string, string>()
    for (const entry of entries) {
      if (entry.issue) items.set(`issue:${entry.issue.id}`, `${entry.issue.code} · ${entry.issue.title}`)
      if (entry.task) items.set(`task:${entry.task.id}`, `${entry.task.code} · ${entry.task.title}`)
    }
    return [...items.entries()]
  }, [entries])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoff = window === 'all' ? 0 : Date.now() - WINDOWS[window] * 86_400_000
    return entries.filter((entry) => {
      const workKey = entry.issue ? `issue:${entry.issue.id}` : entry.task ? `task:${entry.task.id}` : ''
      const haystack = [entry.summary, entry.action, entry.actor.name, entry.actor.code, entry.issue?.code, entry.issue?.title, entry.task?.code, entry.task?.title].filter(Boolean).join(' ').toLowerCase()
      return (!cutoff || new Date(entry.timestamp).getTime() >= cutoff)
        && (action === 'ALL' || entry.action === action)
        && (work === 'ALL' || workKey === work)
        && (!query || haystack.includes(query))
    })
  }, [action, entries, search, window, work])
  const groups = useMemo(() => {
    const grouped = new Map<string, LogEntry[]>()
    for (const entry of filtered) {
      const day = new Date(entry.timestamp).toLocaleDateString('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' })
      grouped.set(day, [...(grouped.get(day) || []), entry])
    }
    return [...grouped.entries()]
  }, [filtered])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Detailed Activity Logs</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Search the timeline by action, issue, task, agent, or execution detail.</p>
      </div>
      <div className="border-b border-white/[0.06] px-6 py-3">
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_220px_140px]">
          <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs…" className="h-9 w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/60" />
          </label>
          <select value={action} onChange={(event) => setAction(event.target.value)} className="h-9 rounded-lg border border-white/[0.08] bg-background px-3 text-[11px]">
            <option value="ALL">All actions</option>
            {actions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={work} onChange={(event) => setWork(event.target.value)} className="h-9 rounded-lg border border-white/[0.08] bg-background px-3 text-[11px]">
            <option value="ALL">All issues and tasks</option>
            {workItems.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={window} onChange={(event) => setWindow(event.target.value)} className="h-9 rounded-lg border border-white/[0.08] bg-background px-3 text-[11px]">
            <option value="day">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All retained</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center"><Activity className="h-6 w-6 text-muted-foreground/40" /><h3 className="mt-3 text-sm text-muted-foreground">No matching activity</h3></GlassPanel>
        ) : (
          <div className="space-y-6">{groups.map(([day, dayEntries]) => (
            <section key={day}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{day}</div>
              <GlassPanel level={2} className="divide-y divide-white/[0.06] rounded-xl px-5">
                {dayEntries.map((entry) => {
                  const open = expanded === entry.id
                  return (
                    <div key={entry.id} className="py-3 text-[11px]">
                      <button onClick={() => setExpanded(open ? null : entry.id)} className="flex w-full items-start gap-3 text-left">
                        {SEVERITY_ICON[entry.status] || SEVERITY_ICON.INFO}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">{entry.summary}</span><span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{entry.action}</span></div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                            <span>{entry.actor.name} · {entry.actor.code}</span>
                            {entry.issue && <span>Issue {entry.issue.code} · {entry.issue.status}</span>}
                            {entry.task && <span>Task {entry.task.code} · {entry.task.status}</span>}
                            <span>{new Date(entry.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST</span>
                          </div>
                        </div>
                        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {open && (
                        <div className="ml-7 mt-3 space-y-3 border-l border-cyan-300/20 pl-4">
                          {entry.steps.length > 0 && <div className="space-y-2">{entry.steps.map((step) => <div key={step.id} className="rounded-lg border border-white/[0.06] bg-black/10 p-3"><div className="flex justify-between"><span className="font-mono text-[10px] text-cyan-200">{step.sequence}. {step.type}{step.toolName ? ` · ${step.toolName}` : ''}</span><span className="text-[9px] text-muted-foreground">{step.status}</span></div>{step.inputSummary && <p className="mt-1 text-muted-foreground">Input: {step.inputSummary}</p>}{step.outputSummary && <p className="mt-1 text-foreground/80">Output: {step.outputSummary}</p>}{step.error && <p className="mt-1 text-red-300">{step.error}</p>}</div>)}</div>}
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-black/20 p-3 font-mono text-[10px] text-muted-foreground">{JSON.stringify(entry.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </GlassPanel>
            </section>
          ))}</div>
        )}
      </div>
    </div>
  )
}
