'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Server, Plug, PlugZap, RefreshCw, Settings, Activity, Shield, ExternalLink, Copy, Check, Key, Image } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface OmniRouteStatus {
  connected: boolean
  baseUrl: string
  hasApiKey?: boolean
  providers: Array<{
    id: string
    name: string
    connected: boolean
    status: string
  }>
  usage?: {
    requests: number
    tokens: number
    cost: number
  }
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return body?.error || fallback
}

export function OmniRouteSettings() {
  const queryClient = useQueryClient()
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [imageModel, setImageModel] = useState('google/gemini-2.0-flash-exp:image')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: status, isLoading, refetch } = useQuery<OmniRouteStatus>({
    queryKey: ['omniroute-status'],
    queryFn: async () => {
      const res = await fetch('/api/omniroute')
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to read OmniRoute status'))
      return res.json()
    },
    refetchInterval: 30000,
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/omniroute')
      if (!res.ok) throw new Error(await readApiError(res, 'Connection test failed'))
      const result = await res.json()
      if (!result.connected) throw new Error('OmniRoute is not reachable')
      return result
    },
    onSuccess: () => toast.success('OmniRoute connection successful'),
    onError: () => toast.error('Cannot reach OmniRoute'),
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/omniroute/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, imageModel }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Connection failed'))
      return res.json()
    },
    onSuccess: () => {
      toast.success('Connected to OmniRoute')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['omniroute-status'] })
    },
    onError: (error) => toast.error('Failed to connect', error.message),
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/omniroute/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Disconnect failed')
    },
    onSuccess: () => {
      toast.success('Disconnected from OmniRoute')
      setApiKey('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['omniroute-status'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/omniroute/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Synced providers and models')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['omniroute-status'] })
    },
  })

  const saveConfigMutation = useMutation({
    mutationFn: async (updates: { baseUrl?: string; apiKey?: string; imageModel?: string }) => {
      const res = await fetch('/api/omniroute/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save config'))
      return res.json()
    },
    onSuccess: () => {
      toast.success('Configuration saved')
      queryClient.invalidateQueries({ queryKey: ['omniroute-status'] })
    },
    onError: (error) => toast.error('Failed to save configuration', error.message),
  })

  useEffect(() => {
    fetch('/api/omniroute/config')
      .then(res => res.ok ? res.json() : null)
      .then(cfg => {
        if (cfg?.baseUrl) setBaseUrl(cfg.baseUrl)
        if (cfg?.imageModel) setImageModel(cfg.imageModel)
        setHasApiKey(Boolean(cfg?.hasApiKey))
      })
      .catch(() => {})
  }, [])

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'
  }

  const getProviderStatusColor = (connected: boolean) => {
    return connected ? 'text-emerald-400' : 'text-amber-400'
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight flex items-center gap-2">
            <Server className="h-4 w-4" /> OmniRoute Gateway
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Single AI routing layer — all EKVAAR OS AI calls go through OmniRoute
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="glass-l2 flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            Refresh
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !status?.connected}
            className="glass-l2 flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {syncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Providers
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <GlassPanel level={2} className="rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${getStatusColor(status?.connected || false)}`}>
              {status?.connected ? <PlugZap className="h-6 w-6" /> : <Plug className="h-6 w-6" />}
            </div>
            <div>
              <div className="font-medium text-sm">
                {status?.connected ? 'Connected to OmniRoute' : 'Not Connected'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {baseUrl || 'http://omniroute:20128/v1'}
              </div>
              {status?.connected && (
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" /> {status.providers?.length || 0} providers
                  </span>
                  {status.usage && (
                    <>
                      <span>{status.usage.requests} requests</span>
                      <span>{status.usage.tokens} tokens</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <button
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-white/05 transition-colors disabled:opacity-40"
                >
                  {testMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                  Test Connection
                </button>
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 text-[11px] font-medium text-red-300 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  <Plug className="h-3.5 w-3.5" /> Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || !baseUrl}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-300 px-4 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {connectMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                Connect
              </button>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Configuration */}
      <GlassPanel level={2} className="rounded-xl p-5 space-y-4">
        <h3 className="font-display text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" /> Configuration
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">OmniRoute Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onBlur={() => saveConfigMutation.mutate({ baseUrl })}
              placeholder="http://omniroute:20128/v1"
              className="h-8 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Internal endpoint of your OmniRoute deployment</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Key className="h-3 w-3" /> API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => apiKey.trim() && saveConfigMutation.mutate({ apiKey })}
              placeholder={hasApiKey ? 'OmniRoute key saved' : 'Paste your OmniRoute API key...'}
              className="h-8 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Encrypted at rest, never exposed to frontend</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" /> Image Generation Model
            </label>
            <Input
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              onBlur={() => saveConfigMutation.mutate({ imageModel })}
              placeholder="google/gemini-2.0-flash-exp:image"
              className="h-8 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Model used for AI image generation via OmniRoute</p>
          </div>
        </div>
      </GlassPanel>

      {/* Providers */}
      {status?.connected && (
        <GlassPanel level={2} className="rounded-xl p-0 overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3">
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              Providers — {status.providers?.filter(p => p.connected).length || 0} connected
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {status.providers?.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${provider.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="font-medium text-sm">{provider.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium uppercase tracking-[0.12em] ${getProviderStatusColor(provider.connected)}`}>
                    {provider.connected ? 'Connected' : provider.status}
                  </span>
                  {!provider.connected && (
                    <button className="glass-l2 flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(!status.providers || status.providers.length === 0) && (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground">
                No providers configured. Click "Sync Providers" to fetch from OmniRoute.
              </div>
            )}
          </div>
          <div className="border-t border-white/[0.06] px-5 py-3">
            <button className="text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors">
              + Add Provider
            </button>
          </div>
        </GlassPanel>
      )}

      {/* Usage */}
      {status?.connected && status.usage && (
        <GlassPanel level={2} className="rounded-xl p-5">
          <h3 className="font-display text-sm mb-4">Usage</h3>
          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Requests</div>
              <div className="mt-1 font-display text-xl tracking-tight">{status.usage.requests.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Tokens</div>
              <div className="mt-1 font-display text-xl tracking-tight">{status.usage.tokens.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Cost</div>
              <div className="mt-1 font-display text-xl tracking-tight">${status.usage.cost.toFixed(2)}</div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  )
}
