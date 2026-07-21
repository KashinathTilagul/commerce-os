'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Loader2 } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ekvaar/desktop/toast'
import { timeAgo } from '@/lib/ekvaar'

interface Note {
  id: string
  title: string
  body: string
  updatedAt: string
}

export function Notes() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const r = await fetch('/api/founder-notes')
      if (!r.ok) throw new Error('Failed to fetch notes')
      const data = await r.json()
      return data
    },
  })

  // Set activeId initially if none selected and notes exist
  useEffect(() => {
    if (notes.length > 0 && !activeId) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/founder-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', body: '' }),
      })
      if (!r.ok) throw new Error('Failed to create note')
      return r.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setActiveId(data.id)
      toast.success('Note created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      const r = await fetch(`/api/founder-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!r.ok) throw new Error('Failed to update note')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/founder-notes/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed to delete note')
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (activeId === deletedId) {
        const remaining = notes.filter((n) => n.id !== deletedId)
        setActiveId(remaining.length > 0 ? remaining[0].id : null)
      }
      toast.success('Note deleted')
    },
  })

  const active = notes.find((n) => n.id === activeId)

  const filtered = search
    ? notes.filter((n) => n.title?.toLowerCase().includes(search.toLowerCase()) || n.body?.toLowerCase().includes(search.toLowerCase()))
    : notes

  const updateNote = (id: string, updates: Partial<Note>) => {
    // Optimistic UI updates
    queryClient.setQueryData(['notes'], (old: Note[] = []) =>
      old.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
    )
    // Debounced API call handled by mutation
    updateMutation.mutate({ id, updates })
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Notes"
        title="Quick Notes"
        description="Capture observations, decisions, and ideas. Notes persist instantly to the EKVAAR OS backend."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            New Note
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0 border-t border-border">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes…"
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 flex justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No notes found</div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={`w-full text-left p-3 border-b border-border/60 hover:bg-muted/50 transition-colors ${
                    activeId === n.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="text-sm font-medium line-clamp-1">{n.title || 'Untitled'}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{n.body || 'No content'}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.updatedAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {active ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <input
                  className="bg-transparent text-sm font-medium outline-none flex-1"
                  value={active.title || ''}
                  onChange={(e) => updateNote(active.id, { title: e.target.value })}
                  placeholder="Note title…"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(active.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <textarea
                className="flex-1 p-4 bg-background text-sm leading-relaxed resize-none outline-none font-mono"
                value={active.body || ''}
                onChange={(e) => updateNote(active.id, { body: e.target.value })}
                placeholder="Start writing…"
              />
              <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-right flex items-center justify-end gap-2">
                {updateMutation.isPending && <span className="text-arav animate-pulse">Saving...</span>}
                <span>{(active.body || '').length} chars · Last edited {timeAgo(active.updatedAt)}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
