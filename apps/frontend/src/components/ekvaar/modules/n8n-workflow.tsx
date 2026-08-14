'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ExternalLink, Play, Workflow } from 'lucide-react'
import { PageHeader } from '../shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ekvaar/desktop/toast'

type N8nStatus = { configured: boolean; workflowId: string; editorUrl: string }

export function N8nWorkflowApp() {
  const [instruction, setInstruction] = useState('Generate the next Ekvaar marketing content cycle')
  const { data, isLoading } = useQuery<N8nStatus>({
    queryKey: ['n8n-status'],
    queryFn: async () => {
      const response = await fetch('/api/n8n')
      if (!response.ok) throw new Error('Could not read n8n status')
      return response.json()
    },
  })
  const run = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'n8n trigger failed')
      return result
    },
    onSuccess: () => toast.success('Workflow started', 'Ekvaar marketing automation accepted the request'),
    onError: (error: any) => toast.error('Workflow not started', error.message),
  })

  return (
    <div className="h-full bg-background">
      <PageHeader
        eyebrow="Automation"
        title="n8n Marketing Studio"
        description="Create, review, store, and publish Ekvaar marketing through the live workflow."
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
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Writer</div><div className="mt-1 font-medium">GLM-5</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Reviewer</div><div className="mt-1 font-medium">Grok 4.3</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Timezone</div><div className="mt-1 font-medium">Asia/Kolkata</div></div>
            </div>
            <div>
              <label htmlFor="n8n-instruction" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Workspace instruction</label>
              <Input id="n8n-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={1000} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-1.5" disabled={!data?.configured || run.isPending || !instruction.trim()} onClick={() => run.mutate()}>
                <Play className="h-3.5 w-3.5" /> {run.isPending ? 'Starting…' : 'Run workflow'}
              </Button>
              <span className="text-xs text-muted-foreground">Workflow {data?.workflowId || 'IF1CS5po1jkq9M7D'} · publishing remains approval-gated</span>
            </div>
            {!isLoading && !data?.configured && (
              <div className="rounded-lg border border-agni/30 bg-agni/10 p-3 text-sm">
                Add <code>N8N_EKVAAR_WEBHOOK_URL</code> to the Ekvaar server environment to enable secure runs. The editor is already available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
