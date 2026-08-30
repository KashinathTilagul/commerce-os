'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { ArrowLeft, Circle, Play, Pause, Loader2, MoreHorizontal, RotateCcw, FileText } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-system'
import { DashboardTab } from './dashboard-tab'
import { InstructionsTab } from './instructions-tab'
import { SkillsTab } from './skills-tab'
import { ConfigurationTab } from './configuration-tab'
import { RunsTab } from './runs-tab'
import { BudgetTab } from './budget-tab'
import { MarketingAutomationTab } from './marketing-automation-tab'
import { ReferencesTab } from './references-tab'
import { timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { invalidateWorkforceState } from '@/lib/query-invalidation'
import { useWindowStore } from '@/lib/window-store'

type Tab = 'dashboard' | 'instructions' | 'skills' | 'configuration' | 'runs' | 'budget' | 'marketing' | 'references'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'skills', label: 'Skills' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'runs', label: 'Runs' },
  { id: 'budget', label: 'Budget' },
  { id: 'references', label: 'References' },
]

const STATUS_DOT: Record<string, string> = {
  RUNNING: 'text-emerald-400',
  IDLE: 'text-muted-foreground/50',
  PAUSED: 'text-amber-400',
  ERROR: 'text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  PAUSED: 'Paused',
  ERROR: 'Error',
  OFFLINE: 'Offline',
}

export function AgentWorkspace({
  agentId,
  onBack,
}: {
  agentId: string
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const storedTab = useWindowStore((state) => state.appState.agents?.agentTab)
  const setAppState = useWindowStore((state) => state.setAppState)
  const [heartbeating, setHeartbeating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const { data: agent, isLoading } = useQuery({
    queryKey: ['workforce-agent', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`)
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const pauseMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update agent status')
      return res.json()
    },
    onSuccess: (_, newStatus) => {
      toast.success(`Agent ${newStatus === 'PAUSED' ? 'paused' : 'resumed'}`)
      invalidateWorkforceState(queryClient, agentId)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Status update failed')
    },
  })

  const handleHeartbeat = useCallback(async () => {
    setHeartbeating(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/heartbeat`, { method: 'POST' })
      if (res.ok || res.status === 202) {
        toast.success('Heartbeat queued')
        invalidateWorkforceState(queryClient, agentId)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Heartbeat failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setHeartbeating(false)
    }
  }, [agentId, queryClient])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>This agent is no longer available.</span>
        <button onClick={onBack} className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-white/[0.06]">
          Back to Agents
        </button>
      </div>
    )
  }

  const dot = STATUS_DOT[agent.status] || STATUS_DOT.IDLE
  const statusLabel = STATUS_LABEL[agent.status] || agent.status
  const canPulse = !agent.isHuman && ['IDLE', 'RUNNING'].includes(agent.status)
  const isPaused = agent.status === 'PAUSED'
  const tabs = agent.department === 'MARKETING' ? [...TABS, { id: 'marketing' as const, label: 'Marketing Automation' }] : TABS
  const tab = tabs.some((item) => item.id === storedTab) ? storedTab as Tab : 'dashboard'
  const setTab = (next: Tab) => setAppState('agents', { agentTab: next })

  return (
    <div className="flex h-full flex-col">
      {/* Persistent header */}
      <GlassPanel level={1} className="shrink-0 rounded-none border-b border-white/[0.06] px-6 py-4">
        {/* Back link */}
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Agents
        </button>

        {/* Agent identity row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: agent.avatarColor || '#6b7280' }}
            >
              {agent.name[0]}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg tracking-tight truncate">{agent.name}</h1>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Circle className={`h-2 w-2 fill-current ${dot}`} />
                  <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{agent.role}</span>
                <span>·</span>
                <span>Reports to {agent.manager?.name || 'Founder'}</span>
                <span>·</span>
                <span>Last heartbeat {timeAgo(agent.lastHeartbeat)}</span>
                <span>·</span>
                <span>₹{Number(agent.tokenSpend || 0).toFixed(0)} / ₹{Number(agent.tokenBudget || 0).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Action cluster */}
          <div className="relative flex items-center gap-2 shrink-0">
            {canPulse && (
              <button
                onClick={handleHeartbeat}
                disabled={heartbeating}
                className="glass-l2 flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-white/[0.12] disabled:opacity-40"
              >
                {heartbeating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run Heartbeat
              </button>
            )}

            <button
              onClick={() => pauseMutation.mutate(isPaused ? 'IDLE' : 'PAUSED')}
              disabled={pauseMutation.isPending}
              className={`glass-l2 flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-colors ${
                isPaused
                  ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {pauseMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.12] hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <GlassPanel level={3} className="absolute right-0 top-9 z-50 w-48 rounded-lg p-1 space-y-0.5 shadow-xl">
                <button
                  onClick={() => { setShowMenu(false); handleHeartbeat() }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px] text-foreground hover:bg-white/[0.08]"
                >
                  <Play className="h-3 w-3 text-emerald-400" />
                  Run Instant Pulse
                </button>
                <button
                  onClick={() => { setShowMenu(false); pauseMutation.mutate(isPaused ? 'IDLE' : 'PAUSED') }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px] text-amber-400 hover:bg-white/[0.08]"
                >
                  <Pause className="h-3 w-3" />
                  {isPaused ? 'Resume Agent' : 'Pause Agent'}
                </button>
                <button
                  onClick={async () => {
                    setShowMenu(false)
                    await fetch(`/api/agents/${agentId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tokenSpend: 0, status: 'IDLE' }),
                    })
                    toast.success('Agent spend reset')
                    invalidateWorkforceState(queryClient, agentId)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Monthly Spend
                </button>
              </GlassPanel>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4 flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                tab === t.id
                  ? 'bg-cyan-300/[0.12] text-cyan-100'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded bg-cyan-300" />
              )}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'dashboard' && <DashboardTab agent={agent} />}
        {tab === 'instructions' && <InstructionsTab agent={agent} />}
        {tab === 'skills' && <SkillsTab agent={agent} />}
        {tab === 'configuration' && <ConfigurationTab agent={agent} />}
        {tab === 'runs' && <RunsTab agentId={agent.id} />}
        {tab === 'budget' && <BudgetTab agent={agent} />}
        {tab === 'marketing' && <MarketingAutomationTab agentId={agent.id} />}
        {tab === 'references' && <ReferencesTab agent={agent} />}
      </div>
    </div>
  )
}
