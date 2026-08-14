'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { FileText, Save, RotateCcw, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ekvaar/desktop/toast'

export function InstructionsTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const [primeDirective, setPrimeDirective] = useState(agent.primeDirective || '')
  const [description, setDescription] = useState(agent.description || '')

  const updateMutation = useMutation({
    mutationFn: async (data: { primeDirective: string; description: string }) => {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update instructions')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agent instructions updated')
      queryClient.invalidateQueries({ queryKey: ['workforce-agent', agent.id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Update failed')
    },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight">Agent Operational Identity</h2>
          <p className="text-[11px] text-muted-foreground">
            Configure system prompts, role scope, and operating principles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPrimeDirective(agent.primeDirective || ''); setDescription(agent.description || '') }}
            className="glass-l2 flex h-7 items-center gap-1 px-3 text-[11px] text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          <button
            onClick={() => updateMutation.mutate({ primeDirective, description })}
            disabled={updateMutation.isPending}
            className="glass-l2 flex h-7 items-center gap-1.5 px-3 text-[11px] font-medium text-foreground rounded-md hover:bg-white/[0.12] transition-colors disabled:opacity-40"
          >
            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Prime Directive */}
      <GlassPanel level={2} className="rounded-xl p-5 space-y-2">
        <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
          Prime Directive (System Prompt Core)
        </label>
        <textarea
          value={primeDirective}
          onChange={(e) => setPrimeDirective(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-black/40 p-3 text-[12px] text-foreground leading-relaxed outline-none border border-white/[0.06] focus:border-white/[0.2] transition-colors"
          placeholder="Specify the agent's primary mission, operating principles, and boundary rules..."
        />
      </GlassPanel>

      {/* Role Description */}
      <GlassPanel level={2} className="rounded-xl p-5 space-y-2">
        <label className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
          Role Description & Scope
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-black/40 p-3 text-[12px] text-foreground leading-relaxed outline-none border border-white/[0.06] focus:border-white/[0.2] transition-colors"
          placeholder="Describe executive duties, reporting expectations, and department authority..."
        />
      </GlassPanel>
    </div>
  )
}
