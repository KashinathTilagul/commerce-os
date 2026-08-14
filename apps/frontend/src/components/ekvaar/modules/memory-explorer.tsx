'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../shared'
import { Brain, Search, Clock, Hash, Database, GitBranch, ZoomIn, ZoomOut, LocateFixed, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Memory = { id: string; type: string; title: string; description: string; severity: string; timestamp: string }
type MemoryResponse = {
  stats: { totalEntities: number; relationships: number; totalEvents: number; recentIndexes: number }
  memories: Memory[]
}
type GraphResponse = {
  source: string
  degraded?: boolean
  nodes: Array<{ id: string; label: string; type: string }>
  edges: Array<{ source: string; target: string; label: string }>
}

export function MemoryExplorer() {
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<GraphResponse['nodes'][number] | null>(null)

  const { data, isLoading } = useQuery<MemoryResponse>({
    queryKey: ['memory'],
    queryFn: async () => {
      const r = await fetch('/api/memory')
      if (!r.ok) throw new Error('Failed to fetch memory')
      return r.json()
    },
  })
  const { data: graph } = useQuery<GraphResponse>({
    queryKey: ['memory-graph'],
    queryFn: async () => {
      const r = await fetch('/api/graph')
      if (!r.ok) throw new Error('Failed to fetch memory graph')
      return r.json()
    },
  })

  const stats = data?.stats || { totalEntities: 0, relationships: 0, totalEvents: 0, recentIndexes: 0 }
  const memories = (data?.memories || []).filter(m => `${m.title} ${m.description} ${m.type}`.toLowerCase().includes(search.toLowerCase()))

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

      <Card className="mt-8 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Agent memory graph</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Relationships retained across agents, work, and decisions.</p>
          </div>
          <Badge variant={graph?.degraded ? 'secondary' : 'outline'}>{graph?.source || 'connecting'}</Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">Select a node to inspect it. Use zoom to explore dense relationships.</div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((value) => Math.max(.65, value - .15))}><ZoomOut className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(1)}><LocateFixed className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((value) => Math.min(1.8, value + .15))}><ZoomIn className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="relative h-[430px] overflow-hidden rounded-xl border bg-[#080b10]">
            <div className="absolute inset-0 origin-center transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
            {graph?.nodes?.length ? (() => {
              const nodes = graph.nodes.slice(0, 24)
              const positions = new Map(nodes.map((node, index) => {
                const angle = (index / nodes.length) * Math.PI * 2
                const radius = 34 + (index % 3) * 8
                return [node.id, { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }]
              }))
              return <>
                <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                  {graph.edges.slice(0, 60).map((edge, index) => {
                    const a = positions.get(edge.source)
                    const b = positions.get(edge.target)
                    return a && b ? <line key={`${edge.source}-${edge.target}-${index}`} x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} stroke="rgba(212,133,155,.28)" strokeWidth="1" /> : null
                  })}
                </svg>
                {nodes.map((node) => {
                  const position = positions.get(node.id)!
                  return <button type="button" key={node.id} title={`${node.label} · ${node.type}`} onClick={() => setSelectedNode(node)} className="absolute -translate-x-1/2 -translate-y-1/2 text-left group" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
                    <div className={`h-3.5 w-3.5 rounded-full border bg-[#c8302a] shadow-[0_0_14px_rgba(200,48,42,.7)] transition-transform group-hover:scale-150 ${selectedNode?.id === node.id ? 'scale-150 border-white' : 'border-[#e9a4b5]'}`} />
                    <span className="absolute left-4 top-1/2 w-28 -translate-y-1/2 truncate text-[10px] text-white/70">{node.label}</span>
                  </button>
                })}
              </>
            })() : <div className="flex h-full items-center justify-center text-sm text-white/40">Memory graph will appear after the first retained agent action.</div>}
            </div>
            {selectedNode && <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-xl sm:right-auto sm:w-80">
              <button className="absolute right-3 top-3 text-white/50 hover:text-white" onClick={() => setSelectedNode(null)}><X className="h-4 w-4" /></button>
              <div className="text-[10px] uppercase tracking-[.22em] text-white/40">{selectedNode.type}</div>
              <div className="mt-1 pr-6 text-sm font-medium">{selectedNode.label}</div>
              <div className="mt-2 text-[11px] text-white/50">{graph?.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length || 0} connected memories</div>
            </div>}
          </div>
        </CardContent>
      </Card>

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
