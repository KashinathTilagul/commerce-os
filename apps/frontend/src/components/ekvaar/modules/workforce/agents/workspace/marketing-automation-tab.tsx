'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Play } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ekvaar/desktop/toast'

async function readApiJson(response: Response) {
  const text = await response.text()
  try { return text ? JSON.parse(text) : {} } catch {
    throw new Error(`Commerce OS server returned ${response.status} ${response.statusText || 'an invalid response'}`)
  }
}

export function MarketingAutomationTab({ agentId }: { agentId: string }) {
  const queryClient = useQueryClient()
  const [instruction, setInstruction] = useState('Generate the next marketing content cycle')
  const { data } = useQuery({
    queryKey: ['agent-marketing-automation', agentId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/marketing-automation`)
      const result = await readApiJson(response)
      if (!response.ok) throw new Error(result.error || 'Unable to load marketing outputs')
      return result
    },
  })
  const run = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/marketing-automation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction }),
      })
      const result = await readApiJson(response)
      if (!response.ok) throw new Error(result.error || 'Workflow failed')
      return result
    },
    onSuccess: () => {
      toast.success('Marketing output ready', 'Saved to the shared marketing ledger')
      queryClient.invalidateQueries({ queryKey: ['agent-marketing-automation', agentId] })
    },
    onError: (error: Error) => toast.error('Marketing workflow failed', error.message),
  })

  return <div className="space-y-4">
    <GlassPanel level={2} className="rounded-xl p-5">
      <h3 className="font-display text-sm">Execute marketing workflow</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">Creates India-first multilingual content for Instagram, Facebook, Threads and LinkedIn. Publishing remains Founder approval-gated.</p>
      <div className="mt-4 flex gap-2">
        <Input value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={1000} />
        <Button className="gap-2" disabled={run.isPending || !instruction.trim()} onClick={() => run.mutate()}>
          {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
        </Button>
      </div>
    </GlassPanel>
    {(data?.runs || []).map((item: any) => <GlassPanel key={item.id} level={2} className="rounded-xl p-4">
      <div className="text-xs font-medium">{item.summary}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{JSON.stringify(item.payload?.result?.plan ?? item.payload?.result, null, 2)}</pre>
    </GlassPanel>)}
  </div>
}
