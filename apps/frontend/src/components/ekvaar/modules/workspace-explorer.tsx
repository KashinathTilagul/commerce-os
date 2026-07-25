'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../shared'
import { Folder, FileText, Search, Grid, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Artifact = { id: string; title: string; type: string; mimeType: string; status: string; createdAt: string }
type Workspace = {
  id: string
  title: string
  status: string
  updatedAt: string
  connections: { provider: string }[]
  artifacts: Artifact[]
  _count: { artifacts: number; revisions: number }
}

export function WorkspaceExplorer() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ['workspace'],
    queryFn: async () => {
      const r = await fetch('/api/workspace')
      if (!r.ok) throw new Error('Failed to fetch workspaces')
      return r.json()
    },
  })

  const workspaces = data?.workspaces || []
  const filtered = workspaces.filter(w => w.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full bg-background flex flex-col p-6">
      <PageHeader
        title="Workspace Explorer"
        description="Unified access to all your artifacts, documents, and designs."
      />

      <div className="flex items-center justify-between mt-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-muted' : ''}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-muted' : ''}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 mt-6 border rounded-md bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading workspaces...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <Folder className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No workspaces yet — agents will create them as they work.</p>
          </div>
        ) : viewMode === 'list' ? (
          <table className="w-full">
            <thead className="border-b bg-muted/50 text-left text-sm font-medium">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Artifacts</th>
                <th className="p-4">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} className="border-b hover:bg-muted/50 cursor-pointer">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {w.title}
                  </td>
                  <td className="p-4 capitalize">{w.status.toLowerCase()}</td>
                  <td className="p-4 capitalize">{w.connections.map(c => c.provider).join(', ') || 'internal'}</td>
                  <td className="p-4 text-muted-foreground">{w._count.artifacts}</td>
                  <td className="p-4 text-muted-foreground">{new Date(w.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {filtered.map(w => (
              <div key={w.id} className="border rounded-md p-4 flex flex-col items-center gap-3 hover:bg-muted/50 cursor-pointer">
                <FileText className="h-10 w-10 text-primary" />
                <span className="text-sm font-medium text-center">{w.title}</span>
                <span className="text-xs text-muted-foreground">{w._count.artifacts} artifacts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
