'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Instagram, Linkedin, MessageCircle, Play, Workflow } from 'lucide-react'
import { PageHeader } from '../shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ekvaar/desktop/toast'

type MarketingRun = { id: string; summary: string; timestamp: string; actorName: string; payload: { result?: { plan?: unknown } } }
type N8nStatus = { configured: boolean; workflowId: string; editorUrl: string; runs: MarketingRun[] }
type OAuthConnection = { provider: string; accountId: string | null; accountName: string | null; expiresAt: string | null }

async function readApiJson(response: Response) {
  const text = await response.text()
  try { return text ? JSON.parse(text) : {} } catch {
    throw new Error(`Ekvaar server returned ${response.status} ${response.statusText || 'an invalid response'}`)
  }
}

export function N8nWorkflowApp() {
  const [instruction, setInstruction] = useState('Generate the next marketing content cycle for this organization')
  const { data: organization } = useQuery<{ name?: string }>({
    queryKey: ['settings', 'organization-name'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      const value = await response.json()
      return { name: value.organizationName }
    },
  })
  const { data, isLoading, refetch } = useQuery<N8nStatus>({
    queryKey: ['n8n-status'],
    queryFn: async () => {
      const response = await fetch('/api/n8n')
      if (!response.ok) throw new Error('Could not read n8n status')
      const result = await readApiJson(response)
      if (!response.ok) throw new Error(result.error || 'Unable to load n8n status')
      return result
    },
  })
  const { data: connectionData } = useQuery<{ connections: OAuthConnection[]; configuration: Record<string, boolean> }>({
    queryKey: ['oauth-connections'],
    queryFn: async () => {
      const response = await fetch('/api/oauth/status')
      if (!response.ok) throw new Error('Could not read channel connections')
      return response.json()
    },
  })
  const connections = connectionData?.connections || []
  const oauthConfiguration = connectionData?.configuration || {}
  const connect = (provider: string) => {
    if (!oauthConfiguration[provider]) {
      toast.error('OAuth app not configured', `${provider} needs a client ID and secret on this deployment.`)
      return
    }
    window.location.href = `/api/oauth/${provider}`
  }
  const run = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      })
      const result = await readApiJson(response)
      if (!response.ok) throw new Error(result.error || 'n8n trigger failed')
      return result
    },
    onSuccess: () => {
      toast.success('Marketing cycle ready', 'The generated output is stored in Ekvaar OS')
      refetch()
    },
    onError: (error: any) => toast.error('Workflow not started', error.message),
  })

  return (
    <div className="h-full bg-background">
      <PageHeader
        eyebrow="AI Workspace · Marketing"
        title="Marketing Command Center"
        description={`${organization?.name || 'Your organization'} creates campaigns through its own AI routing and OAuth connections. Founder approval remains mandatory.`}
        actions={data?.editorUrl ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(data.editorUrl, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-3.5 w-3.5" /> Edit in n8n
          </Button>
        ) : null}
      />
      <div className="px-4 py-8 lg:px-8">
        <Card className="max-w-3xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-noor via-agni to-neel" />
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5" /> Automated Marketing Agent</CardTitle>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${data?.configured ? 'bg-arav/15 text-arav' : 'bg-agni/15 text-agni'}`}>
                {isLoading ? 'Checking' : data?.configured ? 'Connected' : 'Setup required'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Intelligence</div><div className="mt-1 font-medium">Organization routing</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Release gate</div><div className="mt-1 font-medium">Founder approval</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Timezone</div><div className="mt-1 font-medium">Asia/Kolkata</div></div>
            </div>
            <div className="rounded-xl border border-neel/20 bg-neel/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Publishing channels</div>
                  <div className="mt-1 text-xs text-muted-foreground">Connect with OAuth. No Page tokens are entered here.</div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-arav" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => connect('meta')}><Instagram className="h-3.5 w-3.5" /> Connect Meta / Instagram</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => connect('threads')}><MessageCircle className="h-3.5 w-3.5" /> Connect Threads</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => connect('linkedin')}><Linkedin className="h-3.5 w-3.5" /> Connect LinkedIn</Button>
              </div>
              {Object.keys(oauthConfiguration).length > 0 && Object.values(oauthConfiguration).some((ready) => !ready) && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">OAuth buttons remain local until the corresponding app client is configured. This prevents invalid LinkedIn and Meta redirects.</div>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {['meta', 'instagram', 'threads', 'linkedin'].map((provider) => {
                  const connected = connections.find((item) => item.provider === provider)
                  return <div key={provider} className="rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between"><span className="capitalize">{provider === 'meta' ? 'Facebook' : provider}</span><span className={connected ? 'text-arav' : 'text-muted-foreground'}>{connected ? 'Connected' : 'Not connected'}</span></div>
                    {connected && <div className="mt-1 truncate text-[10px] text-muted-foreground">{connected.accountName || connected.accountId}</div>}
                  </div>
                })}
              </div>
            </div>
            <div>
              <label htmlFor="n8n-instruction" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Workspace instruction</label>
              <Input id="n8n-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={1000} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-1.5" disabled={!data?.configured || run.isPending || !instruction.trim()} onClick={() => run.mutate()}>
                <Play className="h-3.5 w-3.5" /> {run.isPending ? 'Starting…' : 'Run workflow'}
              </Button>
              <span className="text-xs text-muted-foreground">AI Workspace → Founder Inbox → OAuth channels · publishing remains approval-gated</span>
            </div>
            {!isLoading && !data?.configured && (
              <div className="rounded-lg border border-agni/30 bg-agni/10 p-3 text-sm">
                Add <code>N8N_EKVAAR_WEBHOOK_URL</code> to the Ekvaar server environment to enable secure runs. Channel connections are managed above with OAuth.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-5 max-w-3xl">
          <CardHeader><CardTitle>Marketing outputs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data?.runs?.length ? data.runs.map((item) => (
              <details key={item.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">{item.summary} · {new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(item.payload.result?.plan ?? item.payload.result, null, 2)}</pre>
              </details>
            )) : <p className="text-sm text-muted-foreground">No completed marketing outputs yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
