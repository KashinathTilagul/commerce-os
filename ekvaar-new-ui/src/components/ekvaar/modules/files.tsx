'use client'

import { useState } from 'react'
import { Folder, FileText, Image, FileCode, FileSpreadsheet, Database, ChevronRight, Home, Search, Upload, FolderPlus } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface FileItem {
  name: string
  type: 'folder' | 'file'
  fileType?: 'text' | 'image' | 'code' | 'sheet' | 'db'
  size?: string
  modified?: string
  children?: FileItem[]
}

const FILE_TREE: FileItem[] = [
  {
    name: 'EKVAAR OS', type: 'folder', children: [
      {
        name: 'Reports', type: 'folder', children: [
          { name: 'Q3 P&L Statement.pdf', type: 'file', fileType: 'text', size: '2.4 MB', modified: '2d ago' },
          { name: 'Cash Flow Forecast.xlsx', type: 'file', fileType: 'sheet', size: '1.1 MB', modified: '5d ago' },
          { name: 'Brand Compliance Q3.pdf', type: 'file', fileType: 'text', size: '4.7 MB', modified: '1w ago' },
        ]
      },
      {
        name: 'Generated Assets', type: 'folder', children: [
          {
            name: 'Campaigns', type: 'folder', children: [
              { name: 'Restoration Series — Hero.png', type: 'file', fileType: 'image', size: '8.2 MB', modified: '3h ago' },
              { name: 'Restoration Series — Email.html', type: 'file', fileType: 'code', size: '142 KB', modified: '3h ago' },
              { name: 'Agni Red Drop — Lookbook.pdf', type: 'file', fileType: 'text', size: '12.4 MB', modified: '5d ago' },
            ]
          },
          {
            name: 'Founder Notes', type: 'folder', children: [
              { name: 'Note 07 — On Permanence.md', type: 'file', fileType: 'text', size: '8 KB', modified: '2d ago' },
              { name: 'Note 08 — Draft.md', type: 'file', fileType: 'text', size: '6 KB', modified: '4h ago' },
            ]
          },
        ]
      },
      {
        name: 'Agent Logs', type: 'folder', children: [
          { name: 'CEO_heartbeat_2024-07-18.log', type: 'file', fileType: 'text', size: '412 KB', modified: '1h ago' },
          { name: 'CMO_heartbeat_2024-07-18.log', type: 'file', fileType: 'text', size: '680 KB', modified: '32m ago' },
          { name: 'CTO_runtime_2024-07-18.log', type: 'file', fileType: 'text', size: '1.2 MB', modified: '15m ago' },
        ]
      },
      {
        name: 'Event Ledger', type: 'folder', children: [
          { name: 'events_2024-07.db', type: 'file', fileType: 'db', size: '18.7 GB', modified: 'now' },
          { name: 'events_archive_Q2.db', type: 'file', fileType: 'db', size: '12.3 GB', modified: '2w ago' },
        ]
      },
      {
        name: 'Knowledge Graph', type: 'folder', children: [
          { name: 'concepts.json', type: 'file', fileType: 'code', size: '4.2 MB', modified: '1d ago' },
          { name: 'relationships.json', type: 'file', fileType: 'code', size: '8.7 MB', modified: '1d ago' },
        ]
      },
      {
        name: 'System', type: 'folder', children: [
          { name: 'config.yaml', type: 'file', fileType: 'code', size: '12 KB', modified: '3d ago' },
          { name: 'agent_souls/', type: 'folder', children: [] },
          { name: 'playbooks/', type: 'folder', children: [] },
        ]
      },
    ]
  }
]

const FILE_ICONS = {
  text: FileText,
  image: Image,
  code: FileCode,
  sheet: FileSpreadsheet,
  db: Database,
}

const FILE_COLORS = {
  text: '#5AC8FA',
  image: '#FF2D55',
  code: '#34C759',
  sheet: '#34C759',
  db: '#8E8E93',
}

export function Files() {
  const [path, setPath] = useState<string[]>(['EKVAAR OS'])
  const [search, setSearch] = useState('')

  const currentFolder = path.reduce((acc, name) => {
    const found = acc.find((f) => f.name === name && f.type === 'folder')
    return found?.children || acc
  }, FILE_TREE)

  const navigate = (name: string) => {
    setPath([...path, name])
  }

  const navigateTo = (idx: number) => {
    setPath(path.slice(0, idx + 1))
  }

  const filtered = search
    ? currentFolder.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : currentFolder

  return (
    <div>
      <PageHeader
        eyebrow="Files · Archive"
        title="System Explorer"
        description="Explore and manage internal data, reports, generated artifacts, agent logs, and the event ledger."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FolderPlus className="h-3.5 w-3.5" /> New Folder
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4">
        {/* Breadcrumb + search */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPath(['EKVAAR OS'])}>
            <Home className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <button
                  onClick={() => navigateTo(i)}
                  className="hover:text-foreground text-muted-foreground"
                >
                  {p}
                </button>
              </span>
            ))}
          </div>
          <div className="ml-auto relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search files…"
              className="pl-9 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* File grid */}
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-40" />
                This folder is empty
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                {filtered.map((f) => {
                  const isFolder = f.type === 'folder'
                  const Icon = isFolder ? Folder : FILE_ICONS[f.fileType || 'text']
                  const color = isFolder ? '#5AC8FA' : FILE_COLORS[f.fileType || 'text']
                  return (
                    <button
                      key={f.name}
                      onClick={() => isFolder && navigate(f.name)}
                      className="flex flex-col items-center gap-2 p-4 rounded-md hover:bg-muted/50 transition-colors text-center group"
                    >
                      <Icon
                        className="h-12 w-12"
                        style={{ color }}
                        strokeWidth={isFolder ? 1.5 : 1.2}
                        fill={isFolder ? `${color}30` : 'none'}
                      />
                      <div className="text-xs font-medium leading-tight line-clamp-2 max-w-full">
                        {f.name}
                      </div>
                      {!isFolder && f.size && (
                        <div className="text-[10px] text-muted-foreground">{f.size}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Storage</div>
              <div className="font-display text-2xl">171.5 GB</div>
              <div className="text-[10px] text-muted-foreground mt-1">of 512 GB used · 33%</div>
              <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-neel" style={{ width: '33%' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Largest Folder</div>
              <div className="font-display text-lg">Event Ledger</div>
              <div className="text-[10px] text-muted-foreground mt-1">31.0 GB · 2 files</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Recently Modified</div>
              <div className="font-display text-lg">events_2024-07.db</div>
              <div className="text-[10px] text-muted-foreground mt-1">18.7 GB · just now</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
