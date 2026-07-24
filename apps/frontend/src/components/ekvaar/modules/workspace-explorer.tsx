'use client'

import { useState } from 'react'
import { PageHeader } from '../shared'
import { Folder, FileText, Search, Grid, List, Table2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const DUMMY_FILES = [
  { id: 1, name: 'Q3 Board Deck', type: 'doc', provider: 'google', date: 'Today, 10:45 AM', size: '2.4 MB' },
  { id: 2, name: 'Brand Guidelines', type: 'design', provider: 'canva', date: 'Yesterday', size: '15 MB' },
  { id: 3, name: 'Financial Model 2026', type: 'sheet', provider: 'google', date: 'Jul 21, 2026', size: '1.2 MB' },
  { id: 4, name: 'Competitor Analysis', type: 'research', provider: 'browser', date: 'Jul 20, 2026', size: '45 KB' },
]

export function WorkspaceExplorer() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')

  const filtered = DUMMY_FILES.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

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
        {viewMode === 'list' ? (
          <table className="w-full">
            <thead className="border-b bg-muted/50 text-left text-sm font-medium">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Last Modified</th>
                <th className="p-4">Size</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-b hover:bg-muted/50 cursor-pointer">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {f.name}
                  </td>
                  <td className="p-4 capitalize">{f.provider}</td>
                  <td className="p-4 text-muted-foreground">{f.date}</td>
                  <td className="p-4 text-muted-foreground">{f.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {filtered.map(f => (
              <div key={f.id} className="border rounded-md p-4 flex flex-col items-center gap-3 hover:bg-muted/50 cursor-pointer">
                <FileText className="h-10 w-10 text-primary" />
                <span className="text-sm font-medium text-center">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.provider}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
