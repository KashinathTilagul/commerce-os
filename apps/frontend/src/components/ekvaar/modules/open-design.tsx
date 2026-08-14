'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Palette } from 'lucide-react'
import { PageHeader } from '../shared'
import { Button } from '@/components/ui/button'

export function OpenDesignApp() {
  const { data, isLoading } = useQuery<{ url: string; configured: boolean }>({ queryKey: ['open-design-config'], queryFn: async () => { const response = await fetch('/api/open-design/config'); if (!response.ok) throw new Error('Open Design configuration unavailable'); return response.json() } })
  return <div className="flex h-full flex-col bg-background">
    <PageHeader eyebrow="AI Workspace · Design" title="Open Design" description="An authenticated design workspace for this organization and its design agents." actions={data?.url ? <Button size="sm" variant="outline" onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open full workspace</Button> : null} />
    <div className="flex flex-1 p-4 lg:p-6">
      {data?.configured ? <iframe title="Open Design workspace" src={data.url} className="h-full min-h-[36rem] w-full rounded-xl border border-white/[0.08] bg-white" allow="clipboard-read; clipboard-write" /> : <div className="m-auto max-w-md rounded-xl border border-white/[0.08] p-8 text-center"><Palette className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-display text-lg">{isLoading ? 'Checking Open Design…' : 'Open Design is not configured'}</h2><p className="mt-2 text-sm text-muted-foreground">An administrator must configure the internal Open Design URL and access token. The OS will expose it through an authenticated same-origin proxy.</p></div>}
    </div>
  </div>
}
