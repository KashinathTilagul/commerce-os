'use client'

import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { DollarSign, Zap, AlertTriangle, Loader2 } from 'lucide-react'

export function CostsPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return data.agents || data || []
    },
  })

  const nonHumanAgents = agents.filter((a: any) => !a.isHuman)
  const totalSpend = nonHumanAgents.reduce((sum: number, a: any) => sum + (a.tokenSpend || 0), 0)
  const totalBudget = nonHumanAgents.reduce((sum: number, a: any) => sum + (a.tokenBudget || 50000), 0)
  const usagePct = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Costs & Budget Allocation</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Financial token spend tracking, warning thresholds (80%), and hard-cap auto-pause enforcement (100%)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <GlassPanel level={2} className="rounded-xl p-5">
                <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">Total Spend</div>
                <div className="mt-2 font-display text-2xl tracking-tight">₹{totalSpend.toFixed(2)}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">Accumulated AI token cost</div>
              </GlassPanel>

              <GlassPanel level={2} className="rounded-xl p-5">
                <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">Budget Allocation</div>
                <div className="mt-2 font-display text-2xl tracking-tight">₹{totalBudget.toFixed(0)}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">Combined agent monthly cap</div>
              </GlassPanel>

              <GlassPanel level={2} className="rounded-xl p-5">
                <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">Overall Usage</div>
                <div className="mt-2 font-display text-2xl tracking-tight">{usagePct}%</div>
                <div className="mt-1 text-[10px] text-emerald-400">Enforced by auto-pause policy</div>
              </GlassPanel>
            </div>

            {/* Agent Budget Breakdown Table */}
            <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
              <h2 className="font-display text-sm tracking-tight">Agent Spend Breakdown</h2>

              <div className="divide-y divide-white/[0.06]">
                {nonHumanAgents.map((a: any) => {
                  const spend = Number(a.tokenSpend || 0)
                  const budget = Number(a.tokenBudget || 50000)
                  const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0
                  const isWarning = pct >= 80
                  const isPaused = a.status === 'PAUSED' || pct >= 100

                  return (
                    <div key={a.id} className="flex items-center justify-between py-3 text-[12px]">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ background: a.avatarColor || '#6b7280' }}
                        >
                          {a.name[0]}
                        </span>
                        <div>
                          <div className="font-medium">{a.name} ({a.code})</div>
                          <div className="text-[10px] text-muted-foreground">{a.role}</div>
                        </div>
                      </div>

                      <div className="w-48 text-right space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={isPaused ? 'text-red-400 font-semibold' : isWarning ? 'text-amber-400' : 'text-foreground'}>
                            ₹{spend.toFixed(0)}
                          </span>
                          <span className="text-muted-foreground">/ ₹{budget.toFixed(0)} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isPaused ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400/70'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassPanel>
          </>
        )}
      </div>
    </div>
  )
}
