'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plug, Zap, CheckCircle2, XCircle, Search, Loader2, Play, Shield, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatINR, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  ecommerce: { label: 'E-Commerce', color: '#C8302A', icon: '🛍️' },
  comms: { label: 'Communications', color: '#1F3A5F', icon: '💬' },
  analytics: { label: 'Analytics', color: '#2F4F3A', icon: '📊' },
  productivity: { label: 'Productivity', color: '#D4859B', icon: '📝' },
  social: { label: 'Social', color: '#8B7355', icon: '📷' },
  devops: { label: 'DevOps', color: '#1F3A5F', icon: '☁️' },
  crm: { label: 'CRM & Sales', color: '#FF9500', icon: '🎯' },
  marketing: { label: 'Marketing', color: '#34C759', icon: '📧' },
  finance: { label: 'Finance', color: '#C8302A', icon: '📒' },
  hr: { label: 'HR & People', color: '#1F3A5F', icon: '👥' },
  design: { label: 'Design', color: '#AF52DE', icon: '🎨' },
  ai: { label: 'AI & ML', color: '#5856D6', icon: '🤖' },
  storage: { label: 'Storage & Files', color: '#FF9500', icon: '📁' },
  database: { label: 'Databases', color: '#2F4F3A', icon: '🗄️' },
  support: { label: 'Support & Feedback', color: '#D4859B', icon: '💡' },
  docs: { label: 'Documentation', color: '#8B7355', icon: '📚' },
}

export function Integrations() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const r = await fetch('/api/integrations')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    refetchInterval: 10000,
  })

  const handleConnect = async (toolkit: string, name: string, action: 'connect' | 'disconnect') => {
    setConnecting(toolkit)
    try {
      const r = await fetch(`/api/integrations/${toolkit}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || 'Failed')

      if (result.action === 'redirect') {
        window.location.href = result.redirectUrl
        return
      }

      toast.success(
        action === 'connect' ? 'Connected' : 'Disconnected',
        `${name} ${action === 'connect' ? 'is now available to agents' : 'has been removed'}`
      )
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (e: any) {
      toast.error('Failed', e.message || `Could not ${action} ${name}`)
    } finally {
      setConnecting(null)
    }
  }

  const handleExecuteTool = async (toolkit: string, toolSlug: string, toolName: string) => {
    setExecuting(toolSlug)
    try {
      const r = await fetch('/api/integrations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitSlug: toolkit,
          toolSlug,
          agentCode: 'FOUNDER',
          agentName: 'Founder',
          input: {},
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const result = await r.json()
      if (result.success) {
        toast.success('Tool executed', `${toolName} completed in ${result.duration}ms`)
      } else {
        toast.error('Execution failed', result.error || 'Unknown error')
      }
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (e: any) {
      toast.error('Execution failed', e.message)
    } finally {
      setExecuting(null)
    }
  }

  const stats = data?.stats
  const grouped = data?.grouped || {}

  const allIntegrations = Object.values(grouped).flat()
  const connectedIntegrations = allIntegrations.filter((i: any) => i.isConnected)
  const filtered = search
    ? allIntegrations.filter((i: any) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : null

  return (
    <div>
      <PageHeader
        eyebrow="Integrations · Composio"
        title="800+ App Connections"
        description="Connect external services via Composio. The digital C-suite agents autonomously call tools — CMO syncs Shopify, CTO deploys via GitHub, CSM sends Gmail. All executions are logged in real-time."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Plug className="h-3 w-3" />
            {stats?.connected || 0} of {stats?.total || 0} connected
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Connected" value={String(stats?.connected || 0)} accent="#34C759" icon={<CheckCircle2 className="h-4 w-4" />} />
          <KpiCard label="Available" value={String(stats?.total || 0)} accent="#1F3A5F" icon={<Plug className="h-4 w-4" />} />
          <KpiCard label="Total Tools" value={String(stats?.totalTools || 0)} accent="#D4859B" icon={<Zap className="h-4 w-4" />} />
          <KpiCard label="Executions" value={String(stats?.totalExecutions || 0)} accent="#C8302A" icon={<Activity className="h-4 w-4" />} />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search 800+ integrations…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Search results or grouped catalog */}
        {filtered ? (
          <div>
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Search Results ({filtered.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((i: any) => (
                <IntegrationCard
                  key={i.id}
                  integration={i}
                  onConnect={handleConnect}
                  onSelect={setSelected}
                  connecting={connecting}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Connected integrations first */}
            {connectedIntegrations.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-base tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-arav" />
                    Connected
                  </h2>
                  <span className="text-[10px] text-muted-foreground">{connectedIntegrations.length} active</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {connectedIntegrations.map((i: any) => (
                    <IntegrationCard
                      key={i.id}
                      integration={i}
                      onConnect={handleConnect}
                      onSelect={setSelected}
                      connecting={connecting}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* All integrations by category */}
            {Object.entries(grouped).map(([category, items]) => {
              const meta = CATEGORY_META[category] || { label: category, color: '#888', icon: '📦' }
              const categoryItems = (items as any[]).filter((i: any) => !i.isConnected)
              if (categoryItems.length === 0) return null
              return (
                <div key={category}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="font-display text-base tracking-tight flex items-center gap-2">
                      <span className="text-lg">{meta.icon}</span>
                      {meta.label}
                    </h2>
                    <span className="text-[10px] text-muted-foreground">
                      {categoryItems.length} available
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryItems.map((i: any) => (
                      <IntegrationCard
                        key={i.id}
                        integration={i}
                        onConnect={handleConnect}
                        onSelect={setSelected}
                        connecting={connecting}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Integration detail dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                      {CATEGORY_META[selected.category]?.icon || '📦'}
                    </div>
                    <div>
                      <DialogTitle className="font-display text-xl tracking-tight">{selected.name}</DialogTitle>
                      <DialogDescription>{selected.description}</DialogDescription>
                    </div>
                    <div className="ml-auto">
                      {selected.isConnected ? (
                        <Badge className="bg-arav/10 text-arav gap-1"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
                      ) : (
                        <Badge variant="outline">Not Connected</Badge>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Agent permissions */}
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Agent Permissions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.agentPermissions ? (
                        selected.agentPermissions.split(',').map((code: string) => (
                          <span key={code} className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm bg-neel/10 text-neel">
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No agents assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Available tools */}
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Available Tools ({selected.tools?.length || 0})
                    </div>
                    <div className="space-y-2">
                      {selected.tools?.map((tool: any) => (
                        <div key={tool.slug} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{tool.name}</div>
                            <div className="text-[10px] text-muted-foreground">{tool.description}</div>
                          </div>
                          {selected.isConnected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-7"
                              disabled={executing === tool.slug}
                              onClick={() => handleExecuteTool(selected.toolkitSlug, tool.slug, tool.name)}
                            >
                              {executing === tool.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              Test
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Tools</div>
                      <div className="font-display text-lg mt-0.5">{selected.toolsCount}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Executions</div>
                      <div className="font-display text-lg mt-0.5">{selected.executionsCount}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Connected</div>
                      <div className="font-display text-lg mt-0.5">{selected.connectedAt ? timeAgo(selected.connectedAt) : '—'}</div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  {selected.isConnected ? (
                    <Button
                      variant="outline"
                      className="gap-1.5 text-agni border-agni/40"
                      disabled={connecting === selected.toolkitSlug}
                      onClick={() => handleConnect(selected.toolkitSlug, selected.name, 'disconnect')}
                    >
                      {connecting === selected.toolkitSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      className="gap-1.5 bg-arav hover:bg-arav"
                      disabled={connecting === selected.toolkitSlug}
                      onClick={() => handleConnect(selected.toolkitSlug, selected.name, 'connect')}
                    >
                      {connecting === selected.toolkitSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                      Connect via Composio
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function IntegrationCard({
  integration: i,
  onConnect,
  onSelect,
  connecting,
}: {
  integration: any
  onConnect: (toolkit: string, name: string, action: 'connect' | 'disconnect') => void
  onSelect: (i: any) => void
  connecting: string | null
}) {
  const meta = CATEGORY_META[i.category] || { icon: '📦' }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer hover:border-foreground/40 transition-colors ${i.isConnected ? 'border-l-4' : ''}`}
        style={{ borderLeftColor: i.isConnected ? '#34C759' : undefined }}
        onClick={() => onSelect(i)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xl flex-shrink-0">
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium truncate">{i.name}</span>
                {i.isConnected && <CheckCircle2 className="h-3.5 w-3.5 text-arav flex-shrink-0" />}
              </div>
              <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{i.description}</div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>{i.toolsCount} tools</span>
                {i.executionsCount > 0 && <span>{i.executionsCount} runs</span>}
                {i.agentPermissions && (
                  <span className="flex items-center gap-0.5">
                    <Shield className="h-2.5 w-2.5" />
                    {i.agentPermissions.split(',').length} agents
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Quick connect/disconnect button */}
          <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
            {i.isConnected ? (
              <button
                onClick={() => onConnect(i.toolkitSlug, i.name, 'disconnect')}
                disabled={connecting === i.toolkitSlug}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider uppercase rounded-md bg-agni/10 text-agni hover:bg-agni/20 transition-colors disabled:opacity-50"
              >
                {connecting === i.toolkitSlug ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => onConnect(i.toolkitSlug, i.name, 'connect')}
                disabled={connecting === i.toolkitSlug}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider uppercase rounded-md bg-arav/10 text-arav hover:bg-arav/20 transition-colors disabled:opacity-50"
              >
                {connecting === i.toolkitSlug ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
                Connect
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
