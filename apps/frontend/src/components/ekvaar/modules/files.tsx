'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Folder, FileText, Image, FileCode, FileSpreadsheet, Database, ChevronRight, Home, Search, Upload, FolderPlus, X, Save, Loader2 } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

interface FileItem {
  name: string
  type: 'folder' | 'file'
  fileType?: 'text' | 'image' | 'code' | 'sheet' | 'db'
  size?: string
  modified?: string
  id?: string
  children?: FileItem[]
}

interface Note { id: string; title: string; body: string; updatedAt: string }

// Empty scaffold — populated dynamically from APIs
const STATIC_TREE: FileItem[] = [
  {
    name: 'EKVAAR OS', type: 'folder', children: [
      { name: 'Founder Notes', type: 'folder', children: [] },
      { name: 'Agent Logs', type: 'folder', children: [
        { name: 'ceo_heartbeat.log', type: 'file', fileType: 'text', size: '2.4 KB', modified: '5m ago' },
        { name: 'cmo_campaign.log', type: 'file', fileType: 'text', size: '1.8 KB', modified: '1h ago' },
      ] },
      { name: 'Event Ledger', type: 'folder', children: [] },
      { name: 'Reports', type: 'folder', children: [] },
      { name: 'Exports', type: 'folder', children: [] },
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
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const r = await fetch('/api/founder-notes')
      return r.ok ? r.json() : []
    },
  })

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const r = await fetch('/api/events?limit=20')
      return r.ok ? r.json() : []
    },
  })

  // Inject real notes into the Founder Notes folder
  const FILE_TREE: FileItem[] = STATIC_TREE.map((root) => ({
    ...root,
    children: root.children?.map((child) => {
      if (child.name === 'Founder Notes') {
        return {
          ...child,
          children: notes.map((n) => ({
            name: `${n.title || 'Untitled'}.md`,
            type: 'file' as const,
            fileType: 'text' as const,
            size: `${n.body?.length || 0} chars`,
            modified: timeAgo(n.updatedAt),
            id: n.id,
          })),
        }
      }
      if (child.name === 'Event Ledger') {
        return {
          ...child,
          children: [
            { name: `events_${new Date().toISOString().slice(0, 7)}.json`, type: 'file' as const, fileType: 'code' as const, size: `${(events.length * 200 / 1024).toFixed(1)} KB`, modified: 'just now' },
          ],
        }
      }
      return child
    }),
  }))

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

  const handleFileClick = (f: FileItem) => {
    if (f.type === 'folder') {
      navigate(f.name)
    } else if (f.id) {
      const note = notes.find(n => n.id === f.id)
      if (note) {
        setSelectedFile(f)
        setEditBody(note.body || '')
      }
    }
  }

  const handleSaveNote = async () => {
    if (!selectedFile?.id || saving) return
    setSaving(true)
    try {
      const r = await fetch(`/api/founder-notes/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody }),
      })
      if (!r.ok) throw new Error('Failed')
      toast.success('Note saved')
      setSelectedFile(null)
    } catch {
      toast.error('Save failed', 'Could not update note')
    } finally {
      setSaving(false)
    }
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
                        onClick={() => handleFileClick(f)}
                        className="flex flex-col items-center gap-2 p-4 rounded-md hover:bg-muted/50 transition-colors text-center group cursor-pointer"
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
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Founder Notes</div>
              <div className="font-display text-2xl">{notes.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{notes.filter(n => n.body?.length > 100).length} with content</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Event Entries</div>
              <div className="font-display text-2xl">{events.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">last 100 recorded</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Agent Logs</div>
              <div className="font-display text-2xl">2</div>
              <div className="text-[10px] text-muted-foreground mt-1">recent activity</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File preview/edit dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(o) => !o && setSelectedFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">{selectedFile?.name || 'File'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full h-80 bg-muted/30 border border-border rounded-md px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-arav"
              placeholder="Note content..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
