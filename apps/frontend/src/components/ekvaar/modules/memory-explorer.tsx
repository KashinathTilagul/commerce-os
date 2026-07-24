'use client'

import { useState } from 'react'
import { PageHeader } from '../shared'
import { Brain, Search, Clock, Hash, Database, GitBranch } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DUMMY_MEMORIES = [
  { id: 1, type: 'entity', title: 'Q3 Board Meeting', description: 'Meeting notes and action items.', confidence: 0.95, tags: ['q3', 'board'] },
  { id: 2, type: 'workflow', title: 'Onboarding Campaign', description: 'Generated 14 assets across Canva and Google Docs.', confidence: 0.88, tags: ['marketing'] },
  { id: 3, type: 'context', title: 'Competitor Pricing', description: 'Extracted from 14 URLs via Browser automation.', confidence: 0.92, tags: ['research', 'pricing'] }
]

export function MemoryExplorer() {
  const [search, setSearch] = useState('')

  return (
    <div className="h-full bg-background flex flex-col p-6 overflow-y-auto">
      <PageHeader 
        title="Memory Explorer" 
        description="Inspect the Knowledge Graph and contextual memory of the OS."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,235</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relationships</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89,102</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vector Store</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 GB</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Indexes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">in the last hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search knowledge graph..." 
            className="pl-8" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {DUMMY_MEMORIES.map(mem => (
            <div key={mem.id} className="p-4 border rounded-lg bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  {mem.title}
                </h4>
                <span className="text-xs text-muted-foreground font-mono">Confidence: {mem.confidence}</span>
              </div>
              <p className="text-sm text-muted-foreground">{mem.description}</p>
              <div className="flex items-center gap-2 mt-2">
                {mem.tags.map(t => (
                  <span key={t} className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
