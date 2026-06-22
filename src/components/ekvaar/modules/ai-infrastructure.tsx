'use client'

import { useQuery } from '@tanstack/react-query'
import { Cpu, Activity, Brain, Sparkles, ShieldCheck, PenTool, Lightbulb, ShoppingBag, User, Package, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EKVAAR_AI_SYSTEMS, timeAgo } from '@/lib/ekvaar'

const PILLAR_ICON: Record<string, any> = {
  brand: ShieldCheck,
  content: PenTool,
  creative: Lightbulb,
  commerce: ShoppingBag,
  founder: User,
  product: Package,
  operations: Wrench,
}

const PILLAR_COLOR: Record<string, string> = {
  brand: '#C8302A',
  content: '#1F3A5F',
  creative: '#D4859B',
  commerce: '#2F4F3A',
  founder: '#8B7355',
  product: '#1F3A5F',
  operations: '#2F4F3A',
}

export function AIInfrastructure() {
  const { data: systems = [] } = useQuery<any[]>({
    queryKey: ['ai-systems'],
    queryFn: async () => {
      const r = await fetch('/api/ai-systems')
      return r.json()
    },
  })

  const avgHealth = systems.length > 0
    ? Math.round(systems.reduce((s, a) => s + a.health, 0) / systems.length)
    : 100
  const totalTasksToday = systems.reduce((s, a) => s + a.tasksToday, 0)
  const totalTasksTotal = systems.reduce((s, a) => s + a.tasksTotal, 0)
  const activeCount = systems.filter((s) => s.status === 'ACTIVE').length

  return (
    <div>
      <PageHeader
        eyebrow="AI Infrastructure"
        title="Seven AI Systems · One House"
        description="EKVAAR is an AI-native fashion house. AI must remain restrained, culturally intelligent, premium, and permanence-oriented. AI should strengthen the House — not dilute it. Seven systems, one operating discipline."
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md">
            <Cpu className="h-3.5 w-3.5 text-arav" />
            <span className="text-xs">{activeCount} active · {systems.length} total</span>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Avg System Health" value={`${avgHealth}%`} accent="#2F4F3A" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="Tasks Today" value={totalTasksToday.toLocaleString('en-IN')} accent="#1F3A5F" icon={<Brain className="h-4 w-4" />} />
          <KpiCard label="Total Tasks Run" value={totalTasksTotal.toLocaleString('en-IN')} accent="#C8302A" />
          <KpiCard label="Active Systems" value={`${activeCount}/${systems.length}`} accent="#D4859B" icon={<Cpu className="h-4 w-4" />} />
        </div>

        {/* AI systems grid */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg tracking-tight">The Seven Systems</h2>
            <span className="text-xs text-muted-foreground">Each strengthens one part of the House</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systems.map((s, i) => {
              const Icon = PILLAR_ICON[s.pillar] || Cpu
              const color = PILLAR_COLOR[s.pillar] || '#888'
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="h-10 w-10 rounded-md flex items-center justify-center"
                          style={{ background: `${color}15`, color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <StatusPill status={s.status} />
                      </div>

                      <h3 className="font-display text-lg tracking-tight">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                        {s.description}
                      </p>

                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Health</span>
                            <span className="font-mono">{s.health}%</span>
                          </div>
                          <Progress value={s.health} className="h-1" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span className="font-mono">{s.accuracy}%</span>
                          </div>
                          <Progress value={s.accuracy} className="h-1" />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Today</div>
                          <div className="font-mono text-sm">{s.tasksToday.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Total</div>
                          <div className="font-mono text-sm">{s.tasksTotal.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-[10px] text-muted-foreground">
                        Last run: {timeAgo(s.lastRun)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* AI principles */}
        <Card className="bg-noor text-rui border-0">
          <CardContent className="p-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-rui/50 mb-3">AI Discipline</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-[10px] tracking-wider uppercase text-arav mb-2">AI Must Be</div>
                <ul className="space-y-2 text-sm text-rui/80">
                  <li>— Restrained. Never loud.</li>
                  <li>— Culturally intelligent. Never costume.</li>
                  <li>— Premium. Never cheap.</li>
                  <li>— Permanence-oriented. Never trend-chasing.</li>
                </ul>
              </div>
              <div>
                <div className="text-[10px] tracking-wider uppercase text-agni mb-2">AI Must Not</div>
                <ul className="space-y-2 text-sm text-rui/60">
                  <li>— Generate meme aesthetics</li>
                  <li>— Drift the brand voice</li>
                  <li>— Push trend-led product</li>
                  <li>— Dilute the House with volume</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-rui/10 text-sm text-rui/70 italic">
              "AI should strengthen the House. Not dilute it."
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
