'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { DollarSign, Save, RotateCcw, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ekvaar/desktop/toast'

export function BudgetTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const [tokenBudget, setTokenBudget] = useState(String(agent.tokenBudget || 50000))

  const spend = Number(agent.tokenSpend || 0)
  const budget = Number(agent.tokenBudget || 50000)
  const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0
  const isWarning = pct >= 80
  const isHardCap = pct >= 100 || agent.status === 'PAUSED'

  const updateMutation = useMutation({
    mutationFn: async (data: { tokenBudget?: number; tokenSpend?: number; status?: string }) => {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update budget')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agent budget updated')
      queryClient.invalidateQueries({ queryKey: ['workforce-agent', agent.id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Update failed')
    },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight">Financial & Token Budget Controls</h2>
          <p className="text-[11px] text-muted-foreground">
            Manage monetary spend limits, warning alerts, and hard-cap enforcement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateMutation.mutate({ tokenSpend: 0, status: 'IDLE' })}
            disabled={updateMutation.isPending}
            className="glass-l2 flex h-7 items-center gap-1.5 px-3 text-[11px] text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Monthly Spend
          </button>

          <button
            onClick={() => updateMutation.mutate({ tokenBudget: parseFloat(tokenBudget) || 50000 })}
            disabled={updateMutation.isPending}
            className="glass-l2 flex h-7 items-center gap-1.5 px-3 text-[11px] font-medium text-foreground rounded-md hover:bg-white/[0.12] transition-colors disabled:opacity-40"
          >
            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Limit
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Spend Gauge */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">Accumulated Spend</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isHardCap ? 'bg-red-500/20 text-red-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {pct}% used
            </span>
          </div>

          <div className="text-2xl font-display tracking-tight">₹{spend.toFixed(2)}</div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHardCap ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400/80'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </GlassPanel>

        {/* Monthly Limit Input */}
        <GlassPanel level={2} className="rounded-xl p-5 space-y-3">
          <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Monthly Spend Cap (INR)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">₹</span>
            <input
              type="number"
              value={tokenBudget}
              onChange={(e) => setTokenBudget(e.target.value)}
              className="w-full h-9 rounded-lg bg-black/40 px-3 text-[13px] text-foreground font-mono outline-none border border-white/[0.06] focus:border-white/[0.2]"
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            Warning threshold at ₹{(budget * 0.8).toFixed(0)} · Hard cap auto-pause at ₹{budget.toFixed(0)}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
