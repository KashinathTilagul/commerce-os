'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Megaphone, Eye, Heart, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

const PILLAR_META: Record<string, { color: string }> = {
  philosophy: { color: 'bg-noor dark:bg-rui' },
  product: { color: 'bg-agni' },
  culture: { color: 'bg-neel' },
  process: { color: 'bg-arav' },
  founder: { color: 'bg-gulabi' },
  community: { color: 'bg-muted-foreground' },
}
const PILLAR_OPTIONS = Object.keys(PILLAR_META)
const CHANNEL_OPTIONS = ['INSTAGRAM', 'JOURNAL', 'EMAIL', 'HOUSE_ACCESS', 'ALL']

export function CampaignsModule() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [pillar, setPillar] = useState('')
  const [channel, setChannel] = useState('')
  const [budget, setBudget] = useState('')

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/campaigns')
      if (!r.ok) throw new Error('Failed to fetch campaigns')
      return r.json()
    },
  })

  const { data: orgContext } = useQuery<any>({
    queryKey: ['org-context'],
    queryFn: async () => {
      const r = await fetch('/api/organization/context')
      if (!r.ok) return null
      return r.json()
    },
  })

  const createCampaign = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, pillar, channel, budget }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed to create campaign')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign created', `${title} is now in Draft`)
      setDialogOpen(false)
      setTitle(''); setPillar(''); setChannel(''); setBudget('')
    },
    onError: (e: any) => toast.error('Could not create campaign', e.message),
  })

  const liveCampaigns = campaigns.filter((c) => c.status === 'LIVE')
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const avgEngagement = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + c.engagement, 0) / campaigns.length
    : 0
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)

  const allPillars = Array.from(new Set(campaigns.map(c => c.pillar).filter(Boolean))).sort()
  const byPillar = allPillars.map((p) => ({
    pillar: p as string,
    count: campaigns.filter((c) => c.pillar === p).length,
    impressions: campaigns.filter((c) => c.pillar === p).reduce((s, c) => s + c.impressions, 0),
  }))

  const toneOfVoice = orgContext?.toneOfVoice || 'Set your tone of voice in Brand Intelligence'
  const brandDna = orgContext?.brandDna || 'Set your brand DNA in Brand Intelligence'
  const disconnectedCampaigns = campaigns.filter((c) => !c.integrationConnected && ['INSTAGRAM', 'EMAIL'].includes(c.channel))

  return (
    <div>
      <PageHeader
        eyebrow="Content & Campaigns"
        title="Story-Led Campaigns"
        description={`Brand voice: ${toneOfVoice}`}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Campaign
          </Button>
        }
      />
      {disconnectedCampaigns.length > 0 && (
        <div className="mb-5 rounded-xl border border-agni/30 bg-agni/10 px-4 py-3 text-sm text-foreground">
          {disconnectedCampaigns.length} campaign{disconnectedCampaigns.length === 1 ? '' : 's'} need a connected channel before external metrics or publishing can sync.
        </div>
      )}

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Live Campaigns" value={String(liveCampaigns.length)} accent="#2F4F3A" icon={<Megaphone className="h-4 w-4" />} />
          <KpiCard label="Total Impressions" value={totalImpressions.toLocaleString('en-IN')} accent="#1F3A5F" icon={<Eye className="h-4 w-4" />} />
          <KpiCard label="Avg Engagement" value={`${avgEngagement.toFixed(1)}%`} accent="#D4859B" icon={<Heart className="h-4 w-4" />} />
          <KpiCard label="Budget Utilization" value={`${totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0}%`} accent="#C8302A" />
        </div>

        {/* Content pillars */}
        {byPillar.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-lg tracking-tight">Content Pillars</h2>
              <span className="text-xs text-muted-foreground">Every story serves one of these</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {byPillar.map((p) => {
                const meta = PILLAR_META[p.pillar]
                return (
                  <Card key={p.pillar}>
                    <CardContent className="p-4">
                      <div className={`h-1 w-8 ${meta ? meta.color : 'bg-muted'} mb-3`} />
                      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{p.pillar}</div>
                      <div className="font-display text-xl mt-1">{p.count}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{p.impressions.toLocaleString('en-IN')} impressions</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Campaign cards */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg tracking-tight">All Campaigns</h2>
            <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
          </div>
          {campaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No campaigns yet — click New Campaign to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((c) => {
                const meta = PILLAR_META[c.pillar] || PILLAR_META.philosophy
                const budgetPct = c.budget > 0 ? (c.spend / c.budget) * 100 : 0
                const isLive = c.status === 'LIVE'
                const lowEngagement = isLive && c.impressions > 1000 && c.engagement < 1.0
                const overspent = budgetPct > 90
                const hasAlert = lowEngagement || overspent
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`h-full ${hasAlert ? 'border-agni/40' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-1 w-6 ${meta.color}`} />
                            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{c.pillar}</span>
                          </div>
                          <StatusPill status={c.status} />
                        </div>
                        <h3 className="font-display text-lg tracking-tight leading-tight">{c.title}</h3>
                        <div className="text-[10px] text-muted-foreground mt-1">{c.channel}</div>

                        {lowEngagement && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-agni">
                            <span className="h-1.5 w-1.5 rounded-full bg-agni" />
                            Low engagement ({c.engagement.toFixed(1)}%) — consider pausing
                          </div>
                        )}
                        {overspent && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gulabi">
                            <span className="h-1.5 w-1.5 rounded-full bg-gulabi" />
                            Budget {budgetPct.toFixed(0)}% used — review spend
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Impressions</div>
                            <div className="font-mono text-sm">{c.impressions.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Engagement</div>
                            <div className={`font-mono text-sm ${lowEngagement ? 'text-agni' : ''}`}>{c.engagement.toFixed(1)}%</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Budget</span>
                            <span className={`font-mono ${overspent ? 'text-gulabi' : ''}`}>{formatINR(c.spend)} / {formatINR(c.budget)}</span>
                          </div>
                          <Progress value={budgetPct} className="h-1" />
                        </div>

                        <div className="mt-3 text-[10px] text-muted-foreground">
                          Started {timeAgo(c.startDate)}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Brand voice */}
        <Card className="bg-noor text-rui border-0">
          <CardContent className="p-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-rui/50 mb-3">Brand Voice</div>
            <div className="text-sm text-rui/80 leading-relaxed">{brandDna}</div>
            <div className="text-[10px] text-rui/40 mt-4">Edit this in the Brand Intelligence app.</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" />
            </div>
            <div className="space-y-1.5">
              <Label>Pillar</Label>
              <Select value={pillar} onValueChange={setPillar}>
                <SelectTrigger><SelectValue placeholder="Select pillar" /></SelectTrigger>
                <SelectContent>
                  {PILLAR_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Budget (₹)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!title || !pillar || !channel || createCampaign.isPending}
              onClick={() => createCampaign.mutate()}
            >
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
