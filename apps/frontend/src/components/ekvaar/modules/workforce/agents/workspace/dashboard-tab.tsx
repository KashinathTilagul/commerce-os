'use client'

import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Circle, Clock, Zap, Target, Users, TrendingUp } from 'lucide-react'
import { timeAgo } from '@/lib/ekvaar'

const STATUS_DOT: Record<string, string> = {
  RUNNING: 'text-emerald-400',
  IDLE: 'text-muted-foreground/50',
  PAUSED: 'text-amber-400',
  ERROR: 'text-red-400',
}

export function DashboardTab({ agent }: { agent: any }) {
  // Fetch real run stats for this agent
  const { data: runStats } = useQuery({
    queryKey: ['agent-run-stats', agent.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/agents/${agent.id}/runs?limit=0&stats=true`)
        if (!res.ok) return null
        return res.json()
      } catch {
        return null
      }
    },
    refetchInterval: 60_000,
  })

  const budgetPct = agent.tokenBudget > 0 ? Math.round((agent.tokenSpend / agent.tokenBudget) * 100) : 0
  const budgetColor = budgetPct >= 100 ? 'text-red-400' : budgetPct >= 80 ? 'text-amber-400' : 'text-emerald-400'
  const dot = STATUS_DOT[agent.status] || STATUS_DOT.IDLE

  const reportsCount = agent.reports?.length ?? agent._count?.reports ?? 0

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {/* Status */}
      <Plate title="Status" icon={<Circle className={`h-3 w-3 fill-current ${dot}`} />}>
        <div className="text-lg font-display tracking-tight">
          {agent.status === 'RUNNING' ? 'Running' : agent.status === 'IDLE' ? 'Idle' : agent.status}
        </div>
      </Plate>

      {/* Current Work */}
      <Plate title="Current Work" icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />}>
        {agent.currentTask ? (
          <div className="text-sm leading-relaxed">{agent.currentTask}</div>
        ) : (
          <div className="text-[11px] text-muted-foreground/60">No active task</div>
        )}
      </Plate>

      {/* Reporting */}
      <Plate title="Reporting" icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="space-y-1.5 text-[12px]">
          <div><span className="text-muted-foreground">Manager</span> <span className="ml-2">{agent.manager?.name || 'Founder'}</span></div>
          <div><span className="text-muted-foreground">Direct reports</span> <span className="ml-2">{reportsCount > 0 ? `${String(reportsCount).padStart(2, '0')} agents` : 'None'}</span></div>
        </div>
      </Plate>

      {/* Heartbeat */}
      <Plate title="Heartbeat" icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="space-y-1.5 text-[12px]">
          <div><span className="text-muted-foreground">Last run</span> <span className="ml-2">{timeAgo(agent.lastHeartbeat)}</span></div>
          <div><span className="text-muted-foreground">Next scheduled</span> <span className="ml-2 text-muted-foreground/60">Event-driven</span></div>
        </div>
      </Plate>

      {/* Performance */}
      <Plate title="Performance" icon={<TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Issues completed</span> <span>{agent.tasksTotal || 0}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Runs</span> <span>{runStats?.totalRuns ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Success rate</span> <span>{agent.successRate != null ? `${Math.round(agent.successRate)}%` : '—'}</span></div>
        </div>
      </Plate>

      {/* Budget */}
      <Plate title="Budget" icon={<Zap className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className={`text-lg font-display tracking-tight ${budgetColor}`}>
              ₹{Number(agent.tokenSpend || 0).toFixed(0)}
            </span>
            <span className="text-[11px] text-muted-foreground">/ ₹{Number(agent.tokenBudget || 0).toFixed(0)}</span>
          </div>
          {/* Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPct >= 100 ? 'bg-red-400' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400/70'
              }`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{budgetPct}% used</div>
        </div>
      </Plate>
    </div>
  )
}

function Plate({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <GlassPanel level={2} className="rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </GlassPanel>
  )
}
