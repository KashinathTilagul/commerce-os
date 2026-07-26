'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, XCircle, TrendingDown, TrendingUp, Activity, Shield, AlertOctagon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ekvaar/desktop/toast'

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#C8302A',
  HIGH: '#D97706',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
}

const CATEGORY_ICONS: Record<string, any> = {
  FINANCIAL: TrendingDown,
  OPERATIONAL: Activity,
  MARKETING: TrendingUp,
  INVENTORY: Shield,
  COMMERCE: Shield,
  AGENT: AlertCircle,
  INFRASTRUCTURE: AlertTriangle
}

export function RiskCenter() {
  const [refreshing, setRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ['risk-dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/telemetry/risks/dashboard')
      if (!r.ok) throw new Error('Failed to fetch risk dashboard')
      return r.json()
    },
    refetchInterval: 60000
  })

  const { data: risks = [] } = useQuery<any[]>({
    queryKey: ['risks', 'active'],
    queryFn: async () => {
      const r = await fetch('/api/telemetry/risks?hours=24')
      if (!r.ok) throw new Error('Failed to fetch risks')
      return r.json().then(d => d.risks)
    },
    refetchInterval: 30000
  })

  const { data: signals = [] } = useQuery<any[]>({
    queryKey: ['signals'],
    queryFn: async () => {
      const r = await fetch('/api/telemetry/signals?hours=24')
      if (!r.ok) throw new Error('Failed to fetch signals')
      return r.json().then(d => d.signals)
    },
    refetchInterval: 30000
  })

  const runAssessment = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/telemetry/ingest/from-live-metrics', { method: 'POST' })
      await fetch('/api/telemetry/signals/detect', { method: 'POST' })
      await fetch('/api/telemetry/risks/assess', { method: 'POST' })
      queryClient.invalidateQueries({ queryKey: ['risk-dashboard', 'risks', 'signals'] })
      toast.success('Risk Assessment Complete', 'All telemetry data has been analyzed')
    } catch (e) {
      toast.error('Assessment Failed', 'Could not complete risk assessment')
    } finally {
      setRefreshing(false)
    }
  }

  const resolveRisk = async (riskId: string) => {
    try {
      await fetch(`/api/telemetry/risks/${riskId}/resolve?resolution=Manual%20resolution`, { method: 'POST' })
      queryClient.invalidateQueries({ queryKey: ['risks', 'risk-dashboard'] })
      toast.success('Risk Resolved', 'The risk has been marked as resolved')
    } catch {
      toast.error('Failed', 'Could not resolve risk')
    }
  }

  const summary = dashboard?.summary || { critical: 0, high: 0, medium: 0, low: 0, total_active: 0 }
  const byCategory = dashboard?.by_category || {}
  const topRisks = dashboard?.top_risks || risks.slice(0, 5)

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        eyebrow="Phase 3 · Executive Intelligence"
        title="Risk Center"
        description="Proactive risk detection and monitoring. The OS continuously analyzes telemetry to identify threats before they become critical."
        actions={
          <Button onClick={runAssessment} disabled={refreshing} variant="outline" size="sm" className="gap-2">
            {refreshing ? (
              <>
                <motion.span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Run Assessment
              </>
            )}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto px-4 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Critical Risks"
            value={String(summary.critical)}
            accent={RISK_COLORS.CRITICAL}
            icon={<AlertOctagon className="h-4 w-4" />}
          />
          <KpiCard
            label="High Risks"
            value={String(summary.high)}
            accent={RISK_COLORS.HIGH}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KpiCard
            label="Medium Risks"
            value={String(summary.medium)}
            accent={RISK_COLORS.MEDIUM}
          />
          <KpiCard
            label="Low Risks"
            value={String(summary.low)}
            accent={RISK_COLORS.LOW}
          />
          <KpiCard
            label="Total Active"
            value={String(summary.total_active)}
            accent="#1F3A5F"
          />
        </div>

        {summary.critical > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#C8302A]/10 border border-[#C8302A]/30 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="h-5 w-5 text-[#C8302A]" />
              <div className="flex-1">
                <h3 className="font-semibold text-[#C8302A]">Critical Risk Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {summary.critical} critical risk{summary.critical > 1 ? 's' : ''} require immediate attention
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => queryClient.invalidateQueries({ queryKey: ['risks'] })}>
                Review Now
              </Button>
            </div>
          </motion.div>
        )}

        <Tabs defaultValue="risks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="risks">Active Risks</TabsTrigger>
            <TabsTrigger value="signals">Detected Signals</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence mode="popLayout">
                {topRisks.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                      <h3 className="font-semibold mb-1">All Clear</h3>
                      <p className="text-sm text-muted-foreground">No active risks detected</p>
                    </CardContent>
                  </Card>
                ) : (
                  topRisks.map((risk: any, idx: number) => {
                    const Icon = CATEGORY_ICONS[risk.category] || AlertTriangle
                    const color = RISK_COLORS[risk.risk_level] || '#6B7280'
                    
                    return (
                      <motion.div
                        key={risk.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="mb-3 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${color}20` }}
                              >
                                <Icon className="h-5 w-5" style={{ color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    style={{ borderColor: color, color }}
                                  >
                                    {risk.risk_level}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {risk.category}
                                  </span>
                                </div>
                                <h4 className="font-medium truncate">{risk.message}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Metric: {risk.metric} · Current: {risk.current_value?.toFixed(2) || 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-lg font-bold" style={{ color }}>
                                    {risk.score?.toFixed(0)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">risk score</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resolveRisk(risk.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="signals" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {signals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <h3 className="font-semibold mb-1">No Signals</h3>
                    <p className="text-sm text-muted-foreground">No significant signals in the last 24 hours</p>
                  </CardContent>
                </Card>
              ) : (
                signals.map((signal: any, idx: number) => (
                  <Card key={signal.id || idx} className="mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Badge
                          variant={signal.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                        >
                          {signal.severity}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{signal.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {signal.signal_type} · {signal.metric_name}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(byCategory).map(([cat, data]: [string, any]) => {
                const Icon = CATEGORY_ICONS[cat] || Shield
                return (
                  <Card key={cat}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {cat}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium">{data.total}</span>
                        </div>
                        <Progress value={data.critical > 0 ? 100 : data.high > 0 ? 75 : 25} className="h-2" />
                        <div className="grid grid-cols-2 text-xs gap-2">
                          <span className="text-red-500">Critical: {data.critical}</span>
                          <span className="text-orange-500">High: {data.high}</span>
                          <span className="text-yellow-500">Medium: {data.medium}</span>
                          <span className="text-green-500">Low: {data.low}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
