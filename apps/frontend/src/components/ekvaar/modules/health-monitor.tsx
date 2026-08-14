'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Server, Database, Network } from 'lucide-react'
import { PageHeader } from '../shared'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function HealthMonitor() {
  const { data, isLoading } = useQuery({
    queryKey: ['health-metrics'],
    queryFn: async () => {
      const r = await fetch('/api/health-metrics')
      if (!r.ok) throw new Error('Failed to fetch health metrics')
      return r.json()
    },
    refetchInterval: 30000,
  })

  const integrations = data?.integrations || []

  return (
    <div className="h-full bg-background flex flex-col p-6 overflow-y-auto">
      <PageHeader
        title="Health Monitor"
        description="Live process and integration health for this organization"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card className="md:col-span-1 bg-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{data?.activeAgents ?? '...'}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? formatUptime(data.uptimeSeconds) : '...'}</div>
            <p className="text-xs text-muted-foreground">Since last deploy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? `${data.heapUsedMB} MB` : '...'}</div>
            <p className="text-xs text-muted-foreground">Node heap used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Integrations</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.connectedIntegrations ?? '...'}</div>
            <p className="text-xs text-muted-foreground">of {integrations.length} available</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" /> Integration Status
        </h3>
        <div className="rounded-md border bg-card text-card-foreground">
          <table className="w-full">
            <thead className="border-b bg-muted/50 text-left text-sm font-medium">
              <tr>
                <th className="p-4">Integration</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tools</th>
                <th className="p-4">Executions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={4}>Loading...</td></tr>
              ) : integrations.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={4}>No integrations configured yet.</td></tr>
              ) : (
                integrations.map((i: any) => (
                  <tr key={i.name} className="border-b last:border-0">
                    <td className="p-4 font-medium">{i.name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${i.isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        {i.isConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </td>
                    <td className="p-4">{i.toolsCount}</td>
                    <td className="p-4 text-muted-foreground">{i.executionsCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
