'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Key, Loader2, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ekvaar/desktop/toast'
import { LLM_PROVIDERS } from '@/lib/llm-connections'

type Connection = { id: string; provider: string; label: string; status: 'LIVE' | 'ERROR' | 'PENDING'; models: string[]; errorMessage?: string | null }
type RouteSlot = { provider?: string; model?: string }

async function apiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return body?.error || fallback
}

export function LlmConnectionsSettings({ routes, onRouteChange }: {
  routes: [RouteSlot, RouteSlot, RouteSlot]
  onRouteChange: (index: number, provider: string, model: string) => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const { data, isLoading } = useQuery<{ connections: Connection[] }>({
    queryKey: ['llm-connections'],
    queryFn: async () => {
      const response = await fetch('/api/settings/llm-connections')
      if (!response.ok) throw new Error(await apiError(response, 'Could not load LLM connections'))
      return response.json()
    },
  })
  const connections = data?.connections || []
  const liveModels = connections.filter((item) => item.status === 'LIVE').flatMap((item) => item.models.map((model) => ({ provider: item.provider, label: item.label, model })))

  const connect = useMutation({
    mutationFn: async (input: { provider: string; apiKey?: string }) => {
      const response = await fetch('/api/settings/llm-connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      if (!response.ok) throw new Error(await apiError(response, 'Provider test failed'))
      return response.json()
    },
    onSuccess: () => {
      toast.success('LLM is live', 'The key was verified and its models are now available.')
      setOpen(false); setApiKey(''); setProvider('')
      queryClient.invalidateQueries({ queryKey: ['llm-connections'] })
    },
    onError: (error) => toast.error('Key test failed', error.message),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/settings/llm-connections?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await apiError(response, 'Could not remove provider'))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['llm-connections'] }),
    onError: (error) => toast.error('Remove failed', error.message),
  })

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div><div className="text-sm font-medium">Connected LLM providers</div><p className="mt-1 text-[11px] text-muted-foreground">A provider becomes selectable only after its key passes a live models request.</p></div>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add new key</Button>
    </div>
    {isLoading ? <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading connections…</div> : connections.length ? (
      <div className="grid gap-2 md:grid-cols-2">{connections.map((connection) => <div key={connection.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
        <div className="min-w-0"><div className="flex items-center gap-2 text-sm font-medium">{connection.status === 'LIVE' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}{connection.label}<span className={connection.status === 'LIVE' ? 'text-[10px] uppercase text-emerald-400' : 'text-[10px] uppercase text-red-400'}>{connection.status}</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{connection.status === 'LIVE' ? `${connection.models.length} models verified` : connection.errorMessage || 'Connection needs testing'}</p></div>
        <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Retest ${connection.label}`} onClick={() => connect.mutate({ provider: connection.provider })} disabled={connect.isPending}><RefreshCw className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-300" aria-label={`Remove ${connection.label}`} onClick={() => remove.mutate(connection.id)} disabled={remove.isPending}><Trash2 className="h-3.5 w-3.5" /></Button></div>
      </div>)}</div>
    ) : <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">No verified LLM keys yet.</div>}
    <div className="space-y-3 border-t border-border pt-4">
      <div><div className="text-sm font-medium">Routing order</div><p className="mt-1 text-[11px] text-muted-foreground">Only models returned by live connections appear here.</p></div>
      {['Primary', 'Fallback 1', 'Fallback 2'].map((label, index) => {
        const route = routes[index]; const value = route.provider && route.model ? `${route.provider}::${route.model}` : ''
        return <div key={label} className="flex items-center justify-between gap-4"><span className="text-xs font-medium">{label}</span><Select value={liveModels.some((item) => `${item.provider}::${item.model}` === value) ? value : ''} onValueChange={(next) => { const [nextProvider, ...modelParts] = next.split('::'); onRouteChange(index, nextProvider, modelParts.join('::')) }} disabled={!liveModels.length}><SelectTrigger className="h-8 w-80 text-xs"><SelectValue placeholder={liveModels.length ? 'Select a connected model' : 'Connect and verify a key first'} /></SelectTrigger><SelectContent>{liveModels.map((item) => <SelectItem key={`${item.provider}:${item.model}`} value={`${item.provider}::${item.model}`}>{item.label} · {item.model}</SelectItem>)}</SelectContent></Select></div>
      })}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add an LLM key</DialogTitle><DialogDescription>Select the provider and enter its key. Ekvaar tests it before marking it Live.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-1.5"><label className="text-xs font-medium">Provider</label><Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger><SelectContent>{Object.entries(LLM_PROVIDERS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><label className="flex items-center gap-1 text-xs font-medium"><Key className="h-3.5 w-3.5" /> API key</label><Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste provider API key" autoComplete="off" /><p className="text-[10px] text-muted-foreground">Encrypted before storage and never returned to the browser.</p></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!provider || !apiKey.trim() || connect.isPending} onClick={() => connect.mutate({ provider, apiKey })}>{connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Test and connect</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
