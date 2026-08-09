'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertTriangle, ArrowRight, Bot, Check, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-system'

type CampaignItem = {
  id: string
  code: string
  title: string
  status: string
  assignee?: { name: string; code: string; avatarColor: string } | null
  serviceKey?: string | null
}

type Campaign = {
  id: string
  code: string
  title: string
  brief: string
  status: string
  updatedAt: string
  items: CampaignItem[]
  validations: { id: string; domain: string; status: string; validatorAgent: { name: string } }[]
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  RUNNING: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200',
  READY: 'border-sky-400/25 bg-sky-400/[0.07] text-sky-200',
  BLOCKED: 'border-red-400/30 bg-red-400/10 text-red-300',
  FAILED: 'border-red-400/30 bg-red-400/10 text-red-300',
}

export function OverviewPage({ onNavigate }: { onNavigate: (section: any) => void }) {
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: campaigns = [], isLoading, error } = useQuery<Campaign[]>({
    queryKey: ['campaign-launches'],
    queryFn: async () => {
      const response = await fetch('/api/campaign-launches')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load campaigns')
      return data
    },
    refetchInterval: 10000,
  })

  const createCampaign = useMutation({
    mutationFn: async (brief: string) => {
      const title = brief.replace(/\s+/g, ' ').trim().slice(0, 80)
      const response = await fetch('/api/campaign-launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, brief, priority: 'P1' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Krishna could not start the campaign')
      return data
    },
    onSuccess: (campaign) => {
      setPrompt('')
      setSelectedId(campaign.id)
      queryClient.invalidateQueries({ queryKey: ['campaign-launches'] })
      queryClient.invalidateQueries({ queryKey: ['workforce-issues'] })
    },
  })

  const runCampaign = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/campaign-launches/${id}/run`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Campaign could not resume')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-launches'] }),
  })

  const selected = campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0]
  const completed = selected?.items.filter((item) => item.status === 'COMPLETED').length ?? 0
  const running = selected?.items.filter((item) => ['READY', 'RUNNING', 'LEASED'].includes(item.status)).length ?? 0
  const blocked = selected?.items.filter((item) => ['BLOCKED', 'FAILED'].includes(item.status)).length ?? 0

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_18%_0%,rgba(17,151,177,0.12),transparent_35%),linear-gradient(180deg,rgba(4,11,16,0.3),transparent_55%)]">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">
              <Sparkles className="h-3 w-3" /> Krishna Command
            </div>
            <h1 className="font-display text-xl tracking-tight">Campaign Control Center</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">Give Krishna the outcome. Employees plan, execute, validate, and return one founder packet.</p>
          </div>
          <button onClick={() => onNavigate('approvals')} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Founder Inbox
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <GlassPanel level={2} className="relative overflow-hidden rounded-2xl border-cyan-300/15 p-5">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 text-[12px] font-medium">What should the company launch?</div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && prompt.trim().length >= 10) createCampaign.mutate(prompt.trim())
                }}
                placeholder="Example: Launch a timeless monsoon collection campaign for oversized tees, with original visuals, margin-safe offer, Instagram, reels, Meta ads and Shopify draft."
                className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan-300/35"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground">No external publishing occurs without founder approval.</span>
                <button
                  disabled={prompt.trim().length < 10 || createCampaign.isPending}
                  onClick={() => createCampaign.mutate(prompt.trim())}
                  className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createCampaign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Brief Krishna
                </button>
              </div>
              {createCampaign.error && <div className="mt-3 text-[11px] text-red-300">{createCampaign.error.message}</div>}
            </div>
          </div>
        </GlassPanel>

        {error && <GlassPanel level={2} className="rounded-xl border-red-400/20 p-4 text-[12px] text-red-300">{error.message}</GlassPanel>}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>
        ) : campaigns.length === 0 ? (
          <GlassPanel level={2} className="rounded-2xl p-10 text-center">
            <Activity className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-3 text-[13px]">No campaign is running.</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Brief Krishna above to activate the employee workflow.</div>
          </GlassPanel>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="mb-3 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Campaigns</div>
              {campaigns.map((campaign) => (
                <button key={campaign.id} onClick={() => setSelectedId(campaign.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === campaign.id ? 'border-cyan-300/25 bg-cyan-300/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-cyan-300/80">{campaign.code}</span><Status status={campaign.status} /></div>
                  <div className="mt-2 line-clamp-2 text-[12px] leading-5">{campaign.title}</div>
                  <div className="mt-2 text-[9px] text-muted-foreground">{campaign.items.filter((item) => item.status === 'COMPLETED').length}/{campaign.items.length} complete</div>
                </button>
              ))}
            </div>

            {selected && <GlassPanel level={2} className="rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-cyan-300/70">{selected.code}</div>
                  <h2 className="mt-1 font-display text-lg">{selected.title}</h2>
                  <p className="mt-1 line-clamp-2 max-w-3xl text-[11px] leading-5 text-muted-foreground">{selected.brief}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!['APPROVAL_PENDING', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'CANCELLED'].includes(selected.status) && (
                    <button
                      onClick={() => runCampaign.mutate(selected.id)}
                      disabled={runCampaign.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-50"
                    >
                      {runCampaign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                      Run / Resume
                    </button>
                  )}
                  <Status status={selected.status} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 py-4">
                <Metric value={`${completed}/${selected.items.length}`} label="Completed" icon={<Check className="h-3 w-3" />} />
                <Metric value={String(running)} label="Active now" icon={<Activity className="h-3 w-3" />} />
                <Metric value={String(blocked)} label="Blocked" icon={<AlertTriangle className="h-3 w-3" />} />
              </div>
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {selected.items.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-3 ${STATUS_COLORS[item.status] ?? 'border-white/[0.07] bg-white/[0.02] text-foreground'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[9px] opacity-70">{item.code}</span>
                      <span className="text-[8px] font-medium uppercase tracking-[0.12em] opacity-75">{item.status.replace('_', ' ')}</span>
                    </div>
                    <div className="mt-2 text-[11px] font-medium leading-4">{item.title}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] opacity-70">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.assignee?.avatarColor ?? '#67e8f9' }} />
                      {item.assignee?.name ?? item.serviceKey ?? 'System'}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate('issues')} className="mt-4 flex items-center gap-1.5 text-[10px] text-cyan-300/80 hover:text-cyan-200">Open employee work log <ArrowRight className="h-3 w-3" /></button>
            </GlassPanel>}
          </div>
        )}
      </div>
    </div>
  )
}

function Status({ status }: { status: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{status.replaceAll('_', ' ')}</span>
}

function Metric({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><div className="flex items-center gap-2 text-[16px] font-medium">{icon}{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div></div>
}
