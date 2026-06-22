'use client'

import { useState, useEffect } from 'react'
import { Cpu, Activity, MemoryStick, HardDrive, Zap, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export function ActivityMonitor() {
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(40).fill(0))
  const [memHistory, setMemHistory] = useState<number[]>(Array(40).fill(0))
  const [stats, setStats] = useState({
    cpu: 0, mem: 0, disk: 0, net: 0, agents: 0, tasks: 0,
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      // Seed initial values
      setCpuHistory(Array.from({ length: 40 }, () => 20 + Math.floor(Math.random() * 60)))
      setMemHistory(Array.from({ length: 40 }, () => 40 + Math.floor(Math.random() * 30)))
      setStats({
        cpu: 42, mem: 58, disk: 34, net: 12, agents: 8, tasks: 127,
      })
    })
    const t = setInterval(() => {
      setCpuHistory((prev) => {
        const next = [...prev.slice(1), Math.max(5, Math.min(95, prev[prev.length - 1] + (Math.floor(Math.random() * 30) - 15)))]
        return next
      })
      setMemHistory((prev) => {
        const next = [...prev.slice(1), Math.max(30, Math.min(85, prev[prev.length - 1] + (Math.floor(Math.random() * 10) - 5)))]
        return next
      })
      setStats((s) => ({
        ...s,
        cpu: Math.max(5, Math.min(95, s.cpu + (Math.floor(Math.random() * 20) - 10))),
        mem: Math.max(30, Math.min(85, s.mem + (Math.floor(Math.random() * 8) - 4))),
        net: Math.max(0, Math.min(100, s.net + (Math.floor(Math.random() * 30) - 15))),
        tasks: s.tasks + Math.floor(Math.random() * 5) - 2,
      }))
    }, 1500)
    return () => { cancelAnimationFrame(raf); clearInterval(t) }
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Activity Monitor"
        title="System Loads"
        description="Real-time monitoring of system resources, background agent tasks, and memory consumption. The OS breathes — watch the heartbeat engine in action."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
            Live · 1.5s interval
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="CPU Load" value={`${stats.cpu}%`} accent="#34C759" icon={<Cpu className="h-4 w-4" />} />
          <KpiCard label="Memory" value={`${stats.mem}%`} accent="#5AC8FA" icon={<MemoryStick className="h-4 w-4" />} />
          <KpiCard label="Active Agents" value={String(stats.agents)} accent="#FF9500" icon={<Zap className="h-4 w-4" />} />
          <KpiCard label="Tasks / min" value={String(stats.tasks)} accent="#FF3B30" icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        {/* CPU Graph */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-arav" /> CPU History
            </CardTitle>
            <CardDescription className="text-xs">System processor load over time</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart data={cpuHistory} color="#34C759" />
          </CardContent>
        </Card>

        {/* Memory Graph */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-neel" /> Memory History
            </CardTitle>
            <CardDescription className="text-xs">RAM allocation across agents and OS</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart data={memHistory} color="#5AC8FA" />
          </CardContent>
        </Card>

        {/* Agent processes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display tracking-tight text-base">Agent Processes</CardTitle>
            <CardDescription className="text-xs">Active background tasks by agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'CEO (Aria)', load: 34, tasks: 12, status: 'Running' },
              { name: 'CMO (Mira)', load: 68, tasks: 28, status: 'Running' },
              { name: 'CTO (Vega)', load: 45, tasks: 19, status: 'Running' },
              { name: 'CFO (Anya)', load: 22, tasks: 8, status: 'Idle' },
              { name: 'COO (Kai)', load: 51, tasks: 15, status: 'Running' },
              { name: 'CCO (Lumen)', load: 73, tasks: 22, status: 'Running' },
              { name: 'CSM (Sage)', load: 18, tasks: 6, status: 'Idle' },
              { name: 'Growth (Pulse)', load: 41, tasks: 11, status: 'Running' },
            ].map((a) => (
              <div key={a.name} className="flex items-center gap-4 py-2 border-b border-border/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground">{a.tasks} active tasks · {a.status}</div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-mono">{a.load}%</span>
                  </div>
                  <Progress value={a.load} className="h-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Disk + Network */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gulabi" /> Disk Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl">34%</div>
              <div className="text-xs text-muted-foreground mt-1">171.5 GB of 512 GB used</div>
              <Progress value={34} className="h-2 mt-3" />
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">Agent Logs</div>
                  <div className="font-mono mt-0.5">42.3 GB</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">Event Ledger</div>
                  <div className="font-mono mt-0.5">18.7 GB</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">Generated Assets</div>
                  <div className="font-mono mt-0.5">68.1 GB</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] tracking-wider uppercase">System</div>
                  <div className="font-mono mt-0.5">42.4 GB</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display tracking-tight text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-arav" /> Network I/O
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl">{stats.net} <span className="text-sm text-muted-foreground">MB/s</span></div>
              <div className="text-xs text-muted-foreground mt-1">Current throughput</div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LLM API calls / min</span>
                  <span className="font-mono">142</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shopify sync</span>
                  <span className="font-mono text-arav">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stripe webhooks</span>
                  <span className="font-mono text-arav">Listening</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Bus throughput</span>
                  <span className="font-mono">{stats.tasks * 3}/s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AreaChart({ data, color }: { data: number[]; color: string }) {
  const max = 100
  const w = 100
  const h = 40
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  const areaPoints = `0,${h} ${points} ${w},${h}`

  return (
    <div className="relative h-40">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute top-0 right-2 text-xs font-mono" style={{ color }}>
        {data[data.length - 1]}%
      </div>
    </div>
  )
}
