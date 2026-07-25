'use client'

import { useQuery } from '@tanstack/react-query'
import { Megaphone, Eye, Heart, Sparkles, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

const PILLAR_META: Record<string, { color: string; description: string }> = {
  philosophy: { color: 'bg-noor dark:bg-rui', description: 'Why we exist. Permanence over speed.' },
  product: { color: 'bg-agni', description: 'The pieces. Built to age well.' },
  culture: { color: 'bg-neel', description: 'India is not costume. Cultural modernism.' },
  process: { color: 'bg-arav', description: 'How the House is built. Systems over chaos.' },
  founder: { color: 'bg-gulabi', description: 'Voice of the founder. Restraint over excess.' },
  community: { color: 'bg-muted-foreground', description: 'Originals, not followers. Belonging.' },
}

export function CampaignsModule() {
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/campaigns')
      if (!r.ok) throw new Error('Failed to fetch campaigns')
      return r.json()
    },
  })

  const liveCampaigns = campaigns.filter((c) => c.status === 'LIVE')
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const avgEngagement = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + c.engagement, 0) / campaigns.length
    : 0
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)

  const allPillars = Array.from(new Set(campaigns.map(c => c.pillar).filter(Boolean))).sort()
  
  // Campaigns by pillar
  const byPillar = allPillars.map((p) => ({
    pillar: p as string,
    count: campaigns.filter((c) => c.pillar === p).length,
    impressions: campaigns.filter((c) => c.pillar === p).reduce((s, c) => s + c.impressions, 0),
  }))

  return (
    <div>
      <PageHeader
        eyebrow="Content & Campaigns"
        title="Story-Led Campaigns"
        description="Brand voice: restrained, intelligent, confident, calm, permanence-first. Avoid trend memes, hype language, overexplaining, cringe marketing."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => toast.info('New Campaign', 'Campaign brief form would open here')}>
            <Plus className="h-3.5 w-3.5" /> New Campaign
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Live Campaigns" value={String(liveCampaigns.length)} accent="#2F4F3A" icon={<Megaphone className="h-4 w-4" />} />
          <KpiCard label="Total Impressions" value={totalImpressions.toLocaleString('en-IN')} accent="#1F3A5F" icon={<Eye className="h-4 w-4" />} />
          <KpiCard label="Avg Engagement" value={`${avgEngagement.toFixed(1)}%`} accent="#D4859B" icon={<Heart className="h-4 w-4" />} />
          <KpiCard label="Budget Utilization" value={`${totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0}%`} accent="#C8302A" />
        </div>

        {/* Content pillars */}
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
                    {meta && <div className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{meta.description}</div>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Campaign cards */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg tracking-tight">All Campaigns</h2>
            <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => {
              const meta = PILLAR_META[c.pillar] || PILLAR_META.philosophy
              const budgetPct = c.budget > 0 ? (c.spend / c.budget) * 100 : 0
              const isLive = c.status === 'LIVE'
              const lowEngagement = isLive && c.impressions > 1000 && c.engagement < 1.0
              const overspent = budgetPct > 90
              const hasAlert = lowEngagement || overspent
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
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

                      {/* Performance alerts */}
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
        </div>

        {/* Brand voice manifesto */}
        <Card className="bg-noor text-rui border-0">
          <CardContent className="p-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-rui/50 mb-3">Brand Voice</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-[10px] tracking-wider uppercase text-arav mb-2">Always</div>
                <ul className="space-y-2 text-sm text-rui/80">
                  <li>— Restrained, intelligent, confident, calm</li>
                  <li>— Permanence-first language</li>
                  <li>— Cultural intelligence, not costume</li>
                  <li>— Story-led, not sales-led</li>
                  <li>— Less "buy now." More "enter the house."</li>
                </ul>
              </div>
              <div>
                <div className="text-[10px] tracking-wider uppercase text-agni mb-2">Forbidden</div>
                <ul className="space-y-2 text-sm text-rui/60">
                  <li>— Trend memes and hype language</li>
                  <li>— Overexplaining the product</li>
                  <li>— Cringe marketing</li>
                  <li>— Algorithm-chasing content</li>
                  <li>— Loud influencer aesthetics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
