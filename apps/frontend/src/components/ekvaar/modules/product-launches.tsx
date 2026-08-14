'use client'

import { FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, PackagePlus, Rocket, ShieldCheck } from 'lucide-react'
import { PageHeader, KpiCard } from '../shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ekvaar/desktop/toast'

type Launch = {
  id: string; code: string; title: string; productType: string; templateKey: string; status: string
  designArtifactId?: string | null; browserJobId?: string | null; blockedReason?: string | null; updatedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  RESEARCHING: 'Researching', DESIGN_REVIEW: 'Needs design', SKU_PLANNED: 'Ready for Qikink',
  QIKINK_DRAFTING: 'Qikink drafting', AWAITING_QIKINK_PUSH: 'Awaiting push approval',
  QIKINK_PUSHED: 'Qikink pushed', SHOPIFY_ENRICHING: 'Shopify enriching', LIVE: 'Live',
  QA_FAILED: 'QA failed', BLOCKED: 'Blocked', CANCELLED: 'Cancelled',
}

export function ProductLaunches() {
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [productType, setProductType] = useState('')
  const [designArtifactId, setDesignArtifactId] = useState('')
  const [creating, setCreating] = useState(false)
  const [drafting, setDrafting] = useState<string | null>(null)
  const { data: launches = [], isLoading } = useQuery<Launch[]>({
    queryKey: ['product-launches'],
    queryFn: async () => {
      const response = await fetch('/api/product-launches')
      if (!response.ok) throw new Error('Could not load launches')
      return response.json()
    },
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['product-launches'] })
  const create = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    try {
      const response = await fetch('/api/product-launches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, productType, designArtifactId: designArtifactId || undefined }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create launch')
      setTitle(''); setProductType(''); setDesignArtifactId('')
      toast.success(`${result.code} created`, result.designArtifactId ? 'Ready to prepare a Qikink draft.' : 'Attach an approved print-ready artifact before Qikink.')
      refresh()
    } catch (error: any) {
      toast.error('Launch not created', error.message)
    } finally { setCreating(false) }
  }

  const prepareDraft = async (launch: Launch) => {
    setDrafting(launch.id)
    try {
      const response = await fetch(`/api/product-launches/${launch.id}/draft`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not queue Qikink draft')
      toast.success('Qikink draft queued', 'The paired local Chrome worker must create the draft and return proof before it can progress.')
      refresh()
    } catch (error: any) {
      toast.error('Qikink draft not queued', error.message)
    } finally { setDrafting(null) }
  }

  const ready = launches.filter((launch) => launch.status === 'SKU_PLANNED').length
  const blocked = launches.filter((launch) => launch.status === 'BLOCKED' || launch.status === 'QA_FAILED').length
  return <div>
    <PageHeader eyebrow="Catalog Operations" title="Product Launches" description="A real launch ledger for evergreen research, approved artwork, Qikink drafts, Shopify enrichment, and live QA. No state advances without proof." />
    <div className="px-4 lg:px-8 py-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Launches" value={String(launches.length)} accent="#1F3A5F" icon={<Rocket className="h-4 w-4" />} />
        <KpiCard label="Ready for Qikink" value={String(ready)} accent="#2F4F3A" icon={<PackagePlus className="h-4 w-4" />} />
        <KpiCard label="Needs attention" value={String(blocked)} accent="#C8302A" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard label="Live" value={String(launches.filter((launch) => launch.status === 'LIVE').length)} accent="#8B7355" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><PackagePlus className="h-4 w-4 text-neel" /> Start a controlled launch</CardTitle><CardDescription>Create the launch only after research and originality review. An artifact ID makes the Qikink draft executable.</CardDescription></CardHeader>
        <CardContent><form onSubmit={create} className="grid gap-3 md:grid-cols-4"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Launch name" required /><Input value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="Product type, e.g. oversized tee" required /><Input value={designArtifactId} onChange={(e) => setDesignArtifactId(e.target.value)} placeholder="Approved print artifact ID" /><Button disabled={creating} type="submit">{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create launch</Button></form></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display text-base">Launch queue</CardTitle><CardDescription>Qikink publishing is deliberately gated. A browser job is evidence, not a completion signal.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{isLoading ? <div className="text-sm text-muted-foreground">Loading launches...</div> : launches.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">No launches yet.</div> : launches.map((launch) => <div key={launch.id} className="rounded-lg border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-xs text-neel">{launch.code}</span><span className="font-medium">{launch.title}</span></div><div className="mt-1 text-xs text-muted-foreground">{launch.productType} · {launch.templateKey} · {STATUS_LABEL[launch.status] || launch.status}</div>{launch.blockedReason && <div className="mt-2 text-xs text-agni">{launch.blockedReason}</div>}{launch.browserJobId && <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Browser job {launch.browserJobId}</div>}</div><div className="flex gap-2">{launch.status === 'SKU_PLANNED' && <Button size="sm" onClick={() => prepareDraft(launch)} disabled={drafting === launch.id}>{drafting === launch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Prepare Qikink draft</>}</Button>}</div></div>)}</CardContent>
      </Card>
    </div>
  </div>
}
