'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Search, Loader2, ChevronDown, ChevronRight, Folder, FolderOpen, Layers, LayoutGrid } from 'lucide-react'
import { AgentCard, type AgentSummary } from './agent-card'
import { toast } from '@/components/ekvaar/desktop/toast'

type Filter = 'all' | 'active' | 'paused' | 'error'
type ViewMode = 'grouped' | 'flat'

const FILTER_STATUS: Record<Filter, string[]> = {
  all: [],
  active: ['IDLE', 'RUNNING'],
  paused: ['PAUSED'],
  error: ['ERROR'],
}

const DEPARTMENT_LABELS: Record<string, string> = {
  EXECUTIVE: 'Leadership',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  RESEARCH: 'Product & Research',
  TECHNOLOGY: 'Technology',
  FINANCE: 'Finance',
  CREATIVE: 'Creative',
  CUSTOMER: 'Customer Success',
  GROWTH: 'Growth & Revenue',
  HR: 'People & HR',
  LEGAL: 'Legal & Compliance',
}

const DEPARTMENT_ORDER = [
  'EXECUTIVE',
  'MARKETING',
  'OPERATIONS',
  'RESEARCH',
  'TECHNOLOGY',
  'FINANCE',
  'CREATIVE',
  'CUSTOMER',
  'GROWTH',
  'HR',
  'LEGAL',
]

export function AgentList({
  onSelectAgent,
}: {
  onSelectAgent: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [heartbeating, setHeartbeating] = useState<string | null>(null)
  
  // Track expanded department groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    EXECUTIVE: true,
    MARKETING: true,
    OPERATIONS: true,
    RESEARCH: true,
    TECHNOLOGY: true,
  })

  const { data: agents = [], isLoading } = useQuery<AgentSummary[]>({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return (data.agents || data || []) as AgentSummary[]
    },
    refetchInterval: 60_000,
  })

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (a.isHuman) return false
      const statusOk = FILTER_STATUS[filter].length === 0 || FILTER_STATUS[filter].includes(a.status)
      const searchOk = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
      return statusOk && searchOk
    })
  }, [agents, filter, search])

  // Group agents by department
  const groupedAgents = useMemo(() => {
    const map: Record<string, AgentSummary[]> = {}
    filtered.forEach((agent) => {
      const dept = (agent.department || 'EXECUTIVE').toUpperCase()
      if (!map[dept]) map[dept] = []
      map[dept].push(agent)
    })
    return map
  }, [filtered])

  const counts = {
    all: agents.filter((a) => !a.isHuman).length,
    active: agents.filter((a) => !a.isHuman && ['IDLE', 'RUNNING'].includes(a.status)).length,
    paused: agents.filter((a) => !a.isHuman && a.status === 'PAUSED').length,
    error: agents.filter((a) => !a.isHuman && a.status === 'ERROR').length,
  }

  const toggleGroup = (deptKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [deptKey]: !prev[deptKey],
    }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    Object.keys(groupedAgents).forEach((k) => (next[k] = true))
    setExpandedGroups(next)
  }

  const collapseAll = () => {
    setExpandedGroups({})
  }

  const handleHeartbeat = async (agentId: string) => {
    setHeartbeating(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/heartbeat`, { method: 'POST' })
      if (res.ok || res.status === 202) {
        toast.success('Heartbeat queued')
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Heartbeat failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setHeartbeating(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <div>
          <h1 className="font-display text-xl tracking-tight">Digital Employees</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {counts.all} bot{counts.all !== 1 ? 's' : ''} organized across workforce groups
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1 border border-white/[0.06]">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Grouped View</span>
          </button>

          <button
            onClick={() => setViewMode('flat')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
              viewMode === 'flat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Flat Grid</span>
          </button>
        </div>
      </div>

      {/* Filter bar + search */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-1">
          {(['all', 'active', 'paused', 'error'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filter === f
                  ? 'bg-white/[0.10] text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-2 text-[11px]">
              <button
                onClick={expandAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Expand All
              </button>
              <span className="text-muted-foreground/30">•</span>
              <button
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bots..."
              className="h-7 w-48 rounded-md bg-white/[0.04] pl-8 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-white/[0.06] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Agent roster grid/groups */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {search ? 'No bots match your search.' : 'No bots in this category.'}
          </div>
        ) : viewMode === 'flat' ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onOpen={() => onSelectAgent(agent.id)}
                onHeartbeat={() => handleHeartbeat(agent.id)}
                heartbeating={heartbeating === agent.id}
              />
            ))}
          </div>
        ) : (
          /* Grouped Accordion View */
          <div className="space-y-4">
            {DEPARTMENT_ORDER.filter((deptKey) => groupedAgents[deptKey]?.length > 0).map((deptKey) => {
              const deptLabel = DEPARTMENT_LABELS[deptKey] || deptKey
              const deptBots = groupedAgents[deptKey] || []
              const isExpanded = expandedGroups[deptKey] !== false

              return (
                <div key={deptKey} className="rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden transition-all">
                  {/* Group Header Bar */}
                  <button
                    onClick={() => toggleGroup(deptKey)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-cyan-300" />
                      ) : (
                        <Folder className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-display text-sm font-semibold tracking-tight text-foreground">
                        {deptLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                        {deptBots.length} bot{deptBots.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>

                  {/* Nested Bots Grid */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-white/[0.04] bg-white/[0.01]">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {deptBots.map((agent) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onOpen={() => onSelectAgent(agent.id)}
                            onHeartbeat={() => handleHeartbeat(agent.id)}
                            heartbeating={heartbeating === agent.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
