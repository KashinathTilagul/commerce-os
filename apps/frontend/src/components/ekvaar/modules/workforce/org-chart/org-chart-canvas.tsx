'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Circle, Play, Loader2 } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'

const STATUS_DOT: Record<string, string> = {
  RUNNING: 'text-emerald-400',
  IDLE: 'text-muted-foreground/50',
  PAUSED: 'text-amber-400',
  ERROR: 'text-red-400',
}

export function OrgChartCanvas({ onSelectAgent }: { onSelectAgent: (id: string) => void }) {
  const [pulseAgentId, setPulseAgentId] = useState<string | null>(null)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return data.agents || data || []
    },
    refetchInterval: 60_000,
  })

  const nonHumans = agents.filter((a: any) => !a.isHuman)

  // C-Suite Chiefs (no managerId or manager is Founder)
  const chiefs = nonHumans.filter((a: any) => !a.managerId || a.code === 'CEO')

  // Direct reports per chief
  const getReports = (chiefId: string) => nonHumans.filter((a: any) => a.managerId === chiefId)

  const handleHeartbeat = async (agentId: string, name: string) => {
    setPulseAgentId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/heartbeat`, { method: 'POST' })
      if (res.ok || res.status === 202) {
        toast.success(`Pulse queued for ${name}`)
      } else {
        toast.error('Heartbeat failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPulseAgentId(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Org Chart Canvas</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Executable organizational hierarchy canvas (Founder → Chiefs → Specialists)
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-8 min-w-[800px]">
            {/* Founder Level */}
            <GlassPanel level={4} className="rounded-xl px-6 py-3 border-amber-500/30 text-center">
              <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-amber-400">COMMAND</div>
              <div className="font-display text-base tracking-tight text-foreground">FOUNDER</div>
              <div className="text-[10px] text-muted-foreground">Executive Authority</div>
            </GlassPanel>

            {/* Connecting line down */}
            <div className="h-6 w-px bg-white/[0.15]" />

            {/* C-Suite Chiefs Level */}
            <div className="flex items-start justify-center gap-6 flex-wrap">
              {chiefs.map((chief: any) => {
                const reports = getReports(chief.id)
                const dot = STATUS_DOT[chief.status] || STATUS_DOT.IDLE

                return (
                  <div key={chief.id} className="flex flex-col items-center space-y-4">
                    {/* Chief Card */}
                    <GlassPanel
                      level={2}
                      className="cursor-pointer rounded-xl p-4 w-60 transition-all hover:border-white/[0.25]"
                      onClick={() => onSelectAgent(chief.id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{chief.code}</span>
                        <div className="flex items-center gap-1">
                          <Circle className={`h-2 w-2 fill-current ${dot}`} />
                          <span className="text-[9px] text-muted-foreground">{chief.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: chief.avatarColor || '#6b7280' }}
                        >
                          {chief.name[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-[12px] truncate">{chief.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{chief.role}</div>
                        </div>
                      </div>

                      {chief.currentTask && (
                        <div className="mt-2 text-[10px] text-foreground/80 truncate">
                          Task: {chief.currentTask}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px]">
                        <span className="text-muted-foreground">₹{Number(chief.tokenSpend || 0).toFixed(0)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleHeartbeat(chief.id, chief.name) }}
                          disabled={pulseAgentId === chief.id}
                          className="flex items-center gap-1 text-emerald-400 hover:underline disabled:opacity-40"
                        >
                          {pulseAgentId === chief.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Pulse
                        </button>
                      </div>
                    </GlassPanel>

                    {/* Connecting line to reports */}
                    {reports.length > 0 && <div className="h-6 w-px bg-white/[0.12]" />}

                    {/* Specialists / Reports */}
                    {reports.length > 0 && (
                      <div className="flex items-center gap-3 flex-wrap justify-center">
                        {reports.map((rep: any) => (
                          <GlassPanel
                            key={rep.id}
                            level={2}
                            className="cursor-pointer rounded-lg p-2.5 w-44 transition-all hover:border-white/[0.2]"
                            onClick={() => onSelectAgent(rep.id)}
                          >
                            <div className="font-medium text-[11px] truncate">{rep.name}</div>
                            <div className="text-[9px] text-muted-foreground truncate">{rep.role}</div>
                          </GlassPanel>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
