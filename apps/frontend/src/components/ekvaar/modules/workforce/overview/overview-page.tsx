'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertTriangle, Archive, ArrowRight, Bot, Check, ExternalLink, FileText, ImageIcon, Loader2, PlugZap, Send, ShieldCheck, Sparkles, Users, TrendingUp, Zap, Target, Circle } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-system'

type CampaignItem = {
  id: string
  code: string
  title: string
  status: string
  assignee?: { name: string; code: string; avatarColor: string } | null
  serviceKey?: string | null
  providerDraft?: Record<string, unknown> | null
  evidenceHash?: string | null
  issue?: { code: string; status: string; comments: { body: string; authorName: string; createdAt: string }[] } | null
}

type Campaign = {
  id: string
  code: string
  title: string
  brief: string
  status: string
  version: number
  updatedAt: string
  items: CampaignItem[]
  validations: { id: string; domain: string; status: string; validatorAgent: { name: string } }[]
  revisions: { revisionNum: number; versionHash: string; status: string; publishStatus: string; publishLogs: { id: string; provider: string; action: string; status: string; error?: string | null }[] }[]
  approvals: { id: string; status: string }[]
}

type ProviderReadiness = { toolkit: string; label: string; connected: boolean; verified: boolean; checkedAt?: string | null; reason?: string | null }

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [planNotice, setPlanNotice] = useState('')
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
  const { data: providers = [] } = useQuery<ProviderReadiness[]>({
    queryKey: ['campaign-provider-readiness'],
    queryFn: async () => {
      const response = await fetch('/api/campaign-launches/readiness')
      if (!response.ok) return []
      return response.json()
    },
  })

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents')
      if (!response.ok) return []
      const data = await response.json()
      return (data.agents || data || [])
    },
    refetchInterval: 30000,
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
      setPlanNotice(`${campaign.plan?.label ?? 'Work assigned'} · ${campaign.plan?.itemCount ?? 1} employee task${campaign.plan?.itemCount === 1 ? '' : 's'}`)
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

  const archiveCampaign = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const response = await fetch(`/api/campaign-launches/${campaign.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: campaign.version }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Work request could not be archived')
      return data
    },
    onSuccess: () => {
      setSelectedId(null)
      setSelectedItemId(null)
      setPlanNotice('Work request archived')
      queryClient.invalidateQueries({ queryKey: ['campaign-launches'] })
      queryClient.invalidateQueries({ queryKey: ['workforce-issues'] })
    },
  })

  const verifyShopify = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/campaign-launches/readiness/shopify', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.reason || 'Shopify connection check failed')
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['campaign-provider-readiness'] }),
  })

  const selected = campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0]
  const completed = selected?.items.filter((item) => item.status === 'COMPLETED').length ?? 0
  const running = selected?.items.filter((item) => ['READY', 'RUNNING', 'LEASED'].includes(item.status)).length ?? 0
  const blocked = selected?.items.filter((item) => ['BLOCKED', 'FAILED'].includes(item.status)).length ?? 0
  const selectedItem = selected?.items.find((item) => item.id === selectedItemId)
    ?? selected?.items.find((item) => item.issue?.comments[0] || item.providerDraft)
  const latestOutput = selectedItem?.issue?.comments[0]?.body ?? ''
  const latestRevision = selected?.revisions[0]

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_18%_0%,rgba(17,151,177,0.12),transparent_35%),linear-gradient(180deg,rgba(4,11,16,0.3),transparent_55%)]">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/70">
              <Sparkles className="h-3 w-3" /> Krishna Command
            </div>
            <h1 className="font-display text-xl tracking-tight">Krishna Work Center</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">Ask for an answer, email, report, asset, business update, or a complete launch. Krishna assigns only the work required.</p>
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
              <div className="mb-2 text-[12px] font-medium">What should Krishna handle?</div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && prompt.trim().length >= 10) createCampaign.mutate(prompt.trim())
                }}
                placeholder="Ask anything: current revenue, an investor email, a PDF report, an image, a video, or an end-to-end campaign launch."
                className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-cyan-300/35"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground">Krishna plans the smallest useful employee workflow before assigning it.</span>
                <button
                  disabled={prompt.trim().length < 10 || createCampaign.isPending}
                  onClick={() => createCampaign.mutate(prompt.trim())}
                  className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createCampaign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Assign work
                </button>
              </div>
              {planNotice && <div className="mt-3 text-[10px] text-emerald-300/80">Plan created: {planNotice}</div>}
              {createCampaign.error && <div className="mt-3 text-[11px] text-red-300">{createCampaign.error.message}</div>}
            </div>
          </div>
        </GlassPanel>

        {error && <GlassPanel level={2} className="rounded-xl border-red-400/20 p-4 text-[12px] text-red-300">{error.message}</GlassPanel>}

        {/* Agent Workforce Summary */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <AgentSummaryCard agents={agents} />
          <AgentSummaryCard agents={agents} metric="running" icon={<Activity className="h-3.5 w-3.5" />} label="Active" color="text-emerald-400" />
          <AgentSummaryCard agents={agents} metric="paused" icon={<Circle className="h-3.5 w-3.5" />} label="Paused" color="text-amber-400" />
          <AgentSummaryCard agents={agents} metric="budget" icon={<Zap className="h-3.5 w-3.5" />} label="Budget Used" color="text-cyan-400" />
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>
        ) : campaigns.length === 0 ? (
          <GlassPanel level={2} className="rounded-2xl p-10 text-center">
            <Activity className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-3 text-[13px]">No campaign is running.</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Ask Krishna above to plan and assign the right employee.</div>
          </GlassPanel>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="mb-3 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Work requests</div>
              {campaigns.map((campaign) => (
                <button key={campaign.id} onClick={() => { setSelectedId(campaign.id); setSelectedItemId(null) }} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === campaign.id ? 'border-cyan-300/25 bg-cyan-300/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-cyan-300/80">{campaign.code}</span><Status status={campaign.items.length < 14 && campaign.status === 'PUBLISHED' ? 'COMPLETED' : campaign.status} /></div>
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
                  {!['PUBLISHING', 'CANCELLED'].includes(selected.status) && (
                    <button
                      onClick={() => archiveCampaign.mutate(selected)}
                      disabled={archiveCampaign.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground disabled:opacity-50"
                    >
                      {archiveCampaign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
                      Archive
                    </button>
                  )}
                  <Status status={selected.items.length < 14 && selected.status === 'PUBLISHED' ? 'COMPLETED' : selected.status} />
                </div>
              </div>
              {archiveCampaign.error && <div className="mt-3 text-[10px] text-red-300">{archiveCampaign.error.message}</div>}
              <div className="grid grid-cols-3 gap-3 py-4">
                <Metric value={`${completed}/${selected.items.length}`} label="Completed" icon={<Check className="h-3 w-3" />} />
                <Metric value={String(running)} label="Active now" icon={<Activity className="h-3 w-3" />} />
                <Metric value={String(blocked)} label="Blocked" icon={<AlertTriangle className="h-3 w-3" />} />
              </div>
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {selected.items.map((item) => (
                  <button key={item.id} onClick={() => setSelectedItemId(item.id)} className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedItem?.id === item.id ? 'ring-1 ring-cyan-200/50' : ''} ${STATUS_COLORS[item.status] ?? 'border-white/[0.07] bg-white/[0.02] text-foreground'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[9px] opacity-70">{item.code}</span>
                      <span className="text-[8px] font-medium uppercase tracking-[0.12em] opacity-75">{item.status.replace('_', ' ')}</span>
                    </div>
                    <div className="mt-2 text-[11px] font-medium leading-4">{item.title}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] opacity-70">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.assignee?.avatarColor ?? '#67e8f9' }} />
                      {item.assignee?.name ?? item.serviceKey ?? 'System'}
                    </div>
                  </button>
                ))}
              </div>
              {selectedItem && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
                    <div><span className="font-mono text-[9px] text-cyan-300">{selectedItem.code}</span><span className="ml-2 text-[11px] font-medium">{selectedItem.title}</span></div>
                    <span className="text-[9px] text-muted-foreground">{selectedItem.assignee?.name ?? selectedItem.serviceKey ?? 'System output'}</span>
                  </div>
                  <div className="space-y-4 p-4">
                    {latestOutput ? <EmployeeOutput output={latestOutput} /> : <div className="text-[11px] text-muted-foreground">Output will appear here when this employee finishes.</div>}
                    {selectedItem.providerDraft && (
                      <div>
                        <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Commerce draft</div>
                        <pre className="overflow-x-auto rounded-lg border border-white/[0.07] bg-black/30 p-3 text-[10px] leading-5 text-emerald-200/80">{JSON.stringify(selectedItem.providerDraft, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selected.items.length === 14 && <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Independent checks</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.validations.map((validation) => <div key={validation.id} className="rounded-lg border border-white/[0.06] px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-[9px]">{validation.domain}</span><Status status={validation.status} /></div><div className="mt-1 text-[8px] text-muted-foreground">{validation.validatorAgent.name}</div></div>)}
                  </div>
                  {latestRevision && <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-3 text-[9px] text-muted-foreground"><span className="text-emerald-300">Revision {latestRevision.revisionNum}</span> · {latestRevision.status} · <span className="font-mono">{latestRevision.versionHash.slice(0, 12)}</span></div>}
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><PlugZap className="h-3.5 w-3.5" /> Publishing readiness</div>
                  <div className="space-y-2">
                    {providers.map((provider) => <div key={provider.toolkit} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2"><div><div className="text-[10px]">{provider.label}</div><div className="mt-0.5 text-[8px] text-muted-foreground">{provider.verified ? 'Connection verified' : provider.connected ? provider.reason || 'Connected' : provider.reason}</div></div>{provider.toolkit === 'shopify' && provider.connected && !provider.verified ? <button onClick={() => verifyShopify.mutate()} disabled={verifyShopify.isPending} className="rounded-md border border-cyan-300/20 px-2 py-1 text-[8px] text-cyan-200">{verifyShopify.isPending ? 'Checking...' : 'Verify'}</button> : <Status status={provider.verified ? 'VERIFIED' : provider.connected ? 'CONNECTED' : 'BLOCKED'} />}</div>)}
                  </div>
                  {verifyShopify.error && <div className="mt-2 text-[9px] text-red-300">{verifyShopify.error.message}</div>}
                </div>
              </div>}
              <button onClick={() => onNavigate('issues')} className="mt-4 flex items-center gap-1.5 text-[10px] text-cyan-300/80 hover:text-cyan-200">Open employee work log <ArrowRight className="h-3 w-3" /></button>
            </GlassPanel>}
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeeOutput({ output }: { output: string }) {
  const assets = output.split('\n').flatMap((line) => {
    const url = line.match(/\/api\/artifacts\/[A-Za-z0-9_-]+/)?.[0]
    if (!url) return []
    const lower = line.toLowerCase()
    return [{ url, type: lower.includes('image') ? 'image' : lower.includes('video') ? 'video' : lower.includes('pdf') ? 'pdf' : lower.includes('audio') ? 'audio' : 'file' }]
  })
  const text = output.split('\n').filter((line) => !line.includes('/api/artifacts/')).join('\n').trim()
  return <div className="space-y-3">
    {assets.map((asset, index) => <div key={`${asset.url}-${index}`} className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
      {asset.type === 'image' && <img src={asset.url} alt="Generated employee asset" className="max-h-[520px] w-full object-contain" />}
      {asset.type === 'video' && <video controls playsInline src={asset.url} className="max-h-[520px] w-full bg-black" />}
      {asset.type === 'pdf' && <iframe src={asset.url} title="Generated employee report" className="h-[520px] w-full bg-white" />}
      {asset.type === 'audio' && <audio controls src={asset.url} className="w-full p-4" />}
      <a href={asset.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-t border-white/[0.07] px-3 py-2 text-[9px] text-cyan-200"><AssetIcon type={asset.type} /> Open generated {asset.type} <ExternalLink className="h-3 w-3" /></a>
    </div>)}
    {text && <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-6 text-foreground/85">{text}</pre>}
  </div>
}

function AssetIcon({ type }: { type: string }) {
  if (type === 'image') return <ImageIcon className="h-3.5 w-3.5" />
  if (type === 'video') return <Video className="h-3.5 w-3.5" />
  if (type === 'audio') return <Volume2 className="h-3.5 w-3.5" />
  return <FileText className="h-3.5 w-3.5" />
}

function Status({ status }: { status: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{status.replaceAll('_', ' ')}</span>
}

function Metric({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><div className="flex items-center gap-2 text-[16px] font-medium">{icon}{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div></div>
}

function AgentSummaryCard({ agents = [], metric = 'total', icon, label, color }: { agents: any[]; metric?: 'total' | 'running' | 'paused' | 'budget'; icon?: React.ReactNode; label?: string; color?: string }) {
  if (metric === 'total') {
    const count = agents.filter((a) => !a.isHuman).length
    return (
      <GlassPanel level={2} className="rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">AI Workforce</div>
            <div className="mt-1 font-display text-2xl tracking-tight">{count}</div>
          </div>
        </div>
      </GlassPanel>
    )
  }
  if (metric === 'running') {
    const count = agents.filter((a) => !a.isHuman && a.status === 'RUNNING').length
    return (
      <GlassPanel level={2} className="rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}/10`}>
            {icon}
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-2xl tracking-tight {color}">{count}</div>
          </div>
        </div>
      </GlassPanel>
    )
  }
  if (metric === 'paused') {
    const count = agents.filter((a) => !a.isHuman && a.status === 'PAUSED').length
    return (
      <GlassPanel level={2} className="rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}/10`}>
            {icon}
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-2xl tracking-tight {color}">{count}</div>
          </div>
        </div>
      </GlassPanel>
    )
  }
  if (metric === 'budget') {
    const totalSpend = agents.filter((a) => !a.isHuman).reduce((sum, a) => sum + (a.tokenSpend || 0), 0)
    const totalBudget = agents.filter((a) => !a.isHuman).reduce((sum, a) => sum + (a.tokenBudget || 0), 0)
    const pct = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0
    const budgetColor = pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'
    return (
      <GlassPanel level={2} className="rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}/10`}>
            {icon}
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-2xl tracking-tight {budgetColor}">{pct}%</div>
            <div className="text-[10px] text-muted-foreground">₹{Number(totalSpend).toLocaleString()} / ₹{Number(totalBudget).toLocaleString()}</div>
          </div>
        </div>
      </GlassPanel>
    )
  }
  return null
}
