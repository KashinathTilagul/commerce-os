'use client'

import { GlassPanel } from '@/components/ui/glass-system'
import { Circle, Play, MoreHorizontal, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/ekvaar'

const STATUS_DOT: Record<string, string> = {
  RUNNING: 'text-emerald-400',
  IDLE: 'text-muted-foreground/50',
  PAUSED: 'text-amber-400',
  ERROR: 'text-red-400',
  OFFLINE: 'text-muted-foreground/20',
}

const STATUS_LABEL: Record<string, string> = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  PAUSED: 'Paused',
  ERROR: 'Error',
  OFFLINE: 'Offline',
}

export interface AgentSummary {
  id: string
  code: string
  name: string
  role: string
  status: string
  department: string
  avatarColor: string
  isHuman: boolean
  currentTask: string | null
  tokenSpend: number
  tokenBudget: number
  lastHeartbeat: string
  managerId: string | null
  managerName?: string
}

export function AgentCard({
  agent,
  onOpen,
  onHeartbeat,
  heartbeating,
}: {
  agent: AgentSummary
  onOpen: () => void
  onHeartbeat: () => void
  heartbeating: boolean
}) {
  const dot = STATUS_DOT[agent.status] || STATUS_DOT.IDLE
  const label = STATUS_LABEL[agent.status] || agent.status
  const budgetPct = agent.tokenBudget > 0 ? Math.round((agent.tokenSpend / agent.tokenBudget) * 100) : 0
  const canPulse = !agent.isHuman && ['IDLE', 'RUNNING'].includes(agent.status)

  return (
    <GlassPanel
      level={2}
      className="group cursor-pointer rounded-xl p-4 transition-all duration-200 hover:border-white/[0.2] hover:shadow-lg hover:translate-y-[-1px]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: agent.avatarColor || '#6b7280' }}
          >
            {agent.name[0]}
          </span>
          <div className="min-w-0">
            <div className="font-medium text-sm leading-tight truncate">{agent.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{agent.role}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Circle className={`h-2 w-2 fill-current ${dot}`} />
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      </div>

      {/* Reports to */}
      <div className="mt-3 text-[10px] text-muted-foreground/70">
        Reports to: {agent.managerName || 'Founder'}
      </div>

      {/* Current work */}
      {agent.currentTask && (
        <div className="mt-1.5 text-[11px] text-foreground/80 truncate">
          Working on: {agent.currentTask}
        </div>
      )}

      {/* Footer: heartbeat + budget + actions */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>Last heartbeat {timeAgo(agent.lastHeartbeat)}</span>
          <span>₹{agent.tokenSpend.toFixed(0)} / ₹{agent.tokenBudget.toFixed(0)}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canPulse && (
            <button
              onClick={(e) => { e.stopPropagation(); onHeartbeat() }}
              disabled={heartbeating}
              className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-40"
              title="Run heartbeat"
            >
              {heartbeating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run
            </button>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}
