'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../shared'
import { Brain, Search, Clock, Hash, Database, GitBranch } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Memory = { id: string; type: string; title: string; description: string; severity: string; timestamp: string }
type MemoryResponse = {
  stats: { totalEntities: number; relationships: number; totalEvents: number; recentIndexes: number }
  memories: Memory[]
}

export function MemoryExplorer() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<MemoryResponse>({
    queryKey: ['memory'],
    queryFn: async () => {
      const r = await fetch('/api/memory')
      if (!r.ok) throw new Error('Failed to fetch memory')
      return r.json()
    },
  })

  const stats = data?.stats || { totalEntities: 0, relationships: 0, totalEvents: 0, recentIndexes: 0 }
  const memories = (data?.memories || []).filter(m => m.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full bg-background flex flex-col p-6 overflow-y-auto">
      <PageHeader
        title="Memory Explorer"
        description="Inspect the OS's event-driven memory of every agent and business action."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Entities</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntities.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relationships</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.relationships.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logged Events</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Indexes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentIndexes}</div>
            <p className="text-xs text-muted-foreground">in the last hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memory..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading memory...</p>
          ) : memories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memory recorded yet — actions across the OS will appear here.</p>
          ) : (
            memories.map(mem => (
              <div key={mem.id} className="p-4 border rounded-lg bg-card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    {mem.title}
                  </h4>
                  <Badge variant={mem.severity === 'CRITICAL' || mem.severity === 'ERROR' ? 'destructive' : 'secondary'}>
                    {mem.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{mem.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" /> {mem.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(mem.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
