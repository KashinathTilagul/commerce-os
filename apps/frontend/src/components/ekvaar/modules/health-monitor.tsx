'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Server, Cpu, Database, Network } from 'lucide-react'
import { PageHeader } from '../shared'

export function HealthMonitor() {
  // In a real app this would use a websocket or polling for real-time telemetry
  // For the prototype we'll fetch from the backend telemetry endpoint once
  const { data, isLoading } = useQuery({
    queryKey: ['telemetry'],
    queryFn: async () => {
      // In Phase 3.0 this fetches live from OS Kernel Telemetry Engine
      return {
        uptime: '4 days, 12:45:12',
        activeProviders: 4,
        memoryUsage: '142 MB',
        cpuUsage: '12%',
        totalWorkflows: 1452,
        activeWorkflows: 3,
        realityMetrics: {
          architecture: 100,
          execution: 100,
          desktop: 100,
          providers: 10,
          liveSync: 5,
          dogfooding: 0,
          learningEngine: 0
        }
      }
    }
  })

  // Calculate weighted average
  const realityScore = data?.realityMetrics 
    ? Math.round(
        (data.realityMetrics.architecture * 0.1) +
        (data.realityMetrics.execution * 0.1) +
        (data.realityMetrics.desktop * 0.1) +
        (data.realityMetrics.providers * 0.2) +
        (data.realityMetrics.liveSync * 0.2) +
        (data.realityMetrics.dogfooding * 0.2) +
        (data.realityMetrics.learningEngine * 0.1)
      )
    : 0

  return (
    <div className="h-full bg-background flex flex-col p-6 overflow-y-auto">
      <PageHeader 
        title="Health Monitor" 
        description="Real-time OS Telemetry and System Metrics"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card className="md:col-span-1 bg-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS Reality Score</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{realityScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">Weighted KPI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kernel Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.uptime || '...'}</div>
            <p className="text-xs text-muted-foreground">Since last reboot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.memoryUsage || '...'}</div>
            <p className="text-xs text-muted-foreground">Total Heap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeProviders || '...'}</div>
            <p className="text-xs text-muted-foreground">Connected to event bus</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" /> Provider Status
        </h3>
        <div className="rounded-md border bg-card text-card-foreground">
          <table className="w-full">
            <thead className="border-b bg-muted/50 text-left text-sm font-medium">
              <tr>
                <th className="p-4">Provider</th>
                <th className="p-4">Status</th>
                <th className="p-4">Latency</th>
                <th className="p-4">Errors (24h)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 font-medium">Google Docs</td>
                <td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"/> Online</div></td>
                <td className="p-4">124ms</td>
                <td className="p-4 text-muted-foreground">0</td>
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium">Google Sheets</td>
                <td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"/> Online</div></td>
                <td className="p-4">156ms</td>
                <td className="p-4 text-muted-foreground">0</td>
              </tr>
              <tr className="border-b">
                <td className="p-4 font-medium">Browser SDK</td>
                <td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"/> Online</div></td>
                <td className="p-4">89ms</td>
                <td className="p-4 text-muted-foreground">0</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">GitHub API</td>
                <td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-500"/> Degraded</div></td>
                <td className="p-4">450ms</td>
                <td className="p-4 text-red-400">12</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
