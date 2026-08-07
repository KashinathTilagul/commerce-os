'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { AgentCard, type AgentSummary } from './agent-card'
import { toast } from '@/components/ekvaar/desktop/toast'

type Filter = 'all' | 'active' | 'paused' | 'error'

const FILTER_STATUS: Record<Filter, string[]> = {
  all: [],
  active: ['IDLE', 'RUNNING'],
  paused: ['PAUSED'],
  error: ['ERROR'],
}

export function AgentList({
  onSelectAgent,
}: {
  onSelectAgent: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [heartbeating, setHeartbeating] = useState<string | null>(null)

  const { data: agents = [], isLoading } = useQuery<AgentSummary[]>({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return (data.agents || data || []) as AgentSummary[]
    },
    refetchInterval: 10000,
  })

  const filtered = agents.filter((a) => {
    if (a.isHuman) return false
    const statusOk = FILTER_STATUS[filter].length === 0 || FILTER_STATUS[filter].includes(a.status)
    const searchOk = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
    return statusOk && searchOk
  })

  const counts = {
    all: agents.filter((a) => !a.isHuman).length,
    active: agents.filter((a) => !a.isHuman && ['IDLE', 'RUNNING'].includes(a.status)).length,
    paused: agents.filter((a) => !a.isHuman && a.status === 'PAUSED').length,
    error: agents.filter((a) => !a.isHuman && a.status === 'ERROR').length,
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
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Agents</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {counts.all} agent{counts.all !== 1 ? 's' : ''} in your organization
        </p>
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

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="h-7 w-48 rounded-md bg-white/[0.04] pl-8 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-white/[0.06] transition-colors"
          />
        </div>
      </div>

      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {search ? 'No agents match your search.' : 'No agents in this category.'}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
