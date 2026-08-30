'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { CheckCircle2, AlertCircle, Clock, Zap, ChevronRight, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/ekvaar'

export function RunsTab({ agentId }: { agentId: string }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['agent-runs', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/runs?limit=30`)
      if (!res.ok) return []
      const data = await res.json()
      return data.runs || []
    },
    refetchInterval: 60_000,
  })

  const { data: selectedRunDetail } = useQuery({
    queryKey: ['agent-run-detail', agentId, selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return null
      const res = await fetch(`/api/agents/${agentId}/runs/${selectedRunId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.run || null
    },
    enabled: Boolean(selectedRunId),
  })

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const runs = runsData || []

  if (runs.length === 0) {
    return (
      <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl px-8 py-16 text-center">
        <Clock className="h-6 w-6 text-muted-foreground/40" />
        <h3 className="mt-3 font-display text-sm tracking-tight text-muted-foreground">No Runs Recorded</h3>
        <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground/60">
          This agent has not executed any heartbeats yet. Click &quot;Run Heartbeat&quot; in the header to trigger an execution run.
        </p>
      </GlassPanel>
    )
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Runs list */}
      <div className="space-y-2 lg:col-span-1">
        <h3 className="font-display text-xs tracking-[0.1em] uppercase text-muted-foreground mb-3">Execution History</h3>
        {runs.map((r: any) => {
          const isSelected = selectedRunId === r.id
          const isSuccess = r.status === 'COMPLETED'
          const isFailed = r.status === 'FAILED'

          return (
            <GlassPanel
              key={r.id}
              level={2}
              className={`cursor-pointer rounded-xl p-3.5 transition-all ${
                isSelected ? 'border-white/[0.25] bg-white/[0.08]' : 'hover:border-white/[0.15]'
              }`}
              onClick={() => setSelectedRunId(r.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : isFailed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
                  )}
                  <span className="font-mono text-[11px] font-medium">{r.status}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Trigger: {r.triggerType}</span>
                <span>₹{Number(r.estimatedCost || 0).toFixed(2)}</span>
              </div>
            </GlassPanel>
          )
        })}
      </div>

      {/* Run detail trace view */}
      <div className="lg:col-span-2">
        {selectedRunDetail ? (
          <GlassPanel level={2} className="rounded-xl p-6 space-y-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">RUN #{selectedRunDetail.id.slice(-8)}</span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase font-medium">
                    {selectedRunDetail.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Triggered by <strong className="text-foreground">{selectedRunDetail.triggerType}</strong> at {new Date(selectedRunDetail.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
                <div>Duration: {selectedRunDetail.durationMs ? `${(selectedRunDetail.durationMs / 1000).toFixed(1)}s` : '—'}</div>
                <div>Cost: ₹{Number(selectedRunDetail.estimatedCost || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Execution Plan (observability, not raw reasoning) */}
            {selectedRunDetail.executionPlan && (
              <div>
                <h4 className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2">Execution Plan</h4>
                <div className="rounded-lg bg-black/40 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">
                  {selectedRunDetail.executionPlan}
                </div>
              </div>
            )}

            {/* Steps Trace */}
            <div>
              <h4 className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-3">Steps ({selectedRunDetail.steps?.length || 0})</h4>
              {selectedRunDetail.steps?.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 py-2">No individual steps recorded for this run.</div>
              ) : (
                <div className="space-y-2">
                  {selectedRunDetail.steps?.map((step: any) => (
                    <div key={step.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px]">
                      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground mb-1">
                        <span>STEP {step.sequence}: {step.type}</span>
                        <span>{step.status}</span>
                      </div>
                      {step.inputSummary && <div className="text-muted-foreground">{step.inputSummary}</div>}
                      {step.outputSummary && <div className="mt-1 font-medium text-foreground">{step.outputSummary}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Token Breakdown */}
            <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <div>Input Tokens: <span className="text-foreground font-mono">{selectedRunDetail.inputTokens || 0}</span></div>
              <div>Output Tokens: <span className="text-foreground font-mono">{selectedRunDetail.outputTokens || 0}</span></div>
              <div>Model: <span className="text-foreground font-mono">{selectedRunDetail.model || 'auto'}</span></div>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center h-full min-h-[300px]">
            <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            <div className="mt-2 text-[12px] text-muted-foreground">Select a run from the list to view its execution trace and step details.</div>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
