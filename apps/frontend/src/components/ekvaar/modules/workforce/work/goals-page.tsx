'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Target, Plus, TrendingUp, Loader2 } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'

export function GoalsPage() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')
  const [agentCode, setAgentCode] = useState('CEO')

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['workforce-goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals')
      if (!res.ok) return []
      const data = await res.json()
      return data.goals || []
    },
    refetchInterval: 10000,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; targetValue: string; unit: string; agentCode: string }) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create goal')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Goal created')
      setTitle('')
      setTargetValue('')
      setUnit('')
      setIsCreating(false)
      queryClient.invalidateQueries({ queryKey: ['workforce-goals'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error creating goal')
    },
  })

  const goals = goalsData || []

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <div>
          <h1 className="font-display text-xl tracking-tight">Company Goals</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Top-level organizational objectives driving agent delegation
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="glass-l2 flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-white/[0.12]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </button>
      </div>

      {/* New Goal Form */}
      {isCreating && (
        <div className="border-b border-white/[0.06] bg-black/40 p-6 space-y-4">
          <h3 className="font-display text-sm">New Strategic Objective</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title (e.g. Cut CAC to ₹2000)"
              className="h-8 rounded-md bg-white/[0.04] px-3 text-[12px] text-foreground outline-none md:col-span-2"
            />
            <div className="flex gap-2">
              <input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Target value (2000)"
                className="h-8 w-1/2 rounded-md bg-white/[0.04] px-3 text-[12px] text-foreground outline-none"
              />
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit (INR / %)"
                className="h-8 w-1/2 rounded-md bg-white/[0.04] px-3 text-[12px] text-foreground outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <select
              value={agentCode}
              onChange={(e) => setAgentCode(e.target.value)}
              className="h-8 rounded-md bg-white/[0.06] px-3 text-[11px] text-foreground outline-none"
            >
              <option value="CEO">Owner: CEO (Krishna)</option>
              <option value="CMO">Owner: CMO (Marketing)</option>
              <option value="CTO">Owner: CTO (Technology)</option>
              <option value="CFO">Owner: CFO (Finance)</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setIsCreating(false)} className="px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={() => title.trim() && createMutation.mutate({ title, targetValue, unit, agentCode })}
                disabled={createMutation.isPending || !title.trim()}
                className="glass-l2 rounded-md px-4 py-1 text-[11px] font-medium text-foreground hover:bg-white/[0.12] disabled:opacity-40"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length === 0 ? (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center">
            <Target className="h-6 w-6 text-muted-foreground/40" />
            <h3 className="mt-3 font-display text-sm tracking-tight text-muted-foreground">No Goals Defined</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground/60">
              Create strategic goals to guide your executive agents in delegating tasks and tracking business metrics.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {goals.map((g: any) => (
              <GlassPanel key={g.id} level={2} className="rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-sm leading-tight">{g.title}</h3>
                    <div className="mt-1 text-[10px] text-muted-foreground">Owner: {g.agentCode} · Mode: {g.mode}</div>
                  </div>
                  <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px]">
                    {g.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                  <div className="text-[11px] text-muted-foreground">Current: <span className="text-foreground font-semibold">{g.currentValue} {g.unit}</span></div>
                  <div className="text-[11px] text-muted-foreground">Target: <span className="text-foreground font-semibold">{g.targetValue} {g.unit}</span></div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
