'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

const STORAGE_KEY = 'ekvaar-notes'

const SEED_NOTES: Note[] = [
  {
    id: '1',
    title: 'Q3 Strategy Notes',
    body: 'Key priorities for Q3:\n\n1. Restoration Series launch — target ₹8.5L spend, 3.2x ROAS projection\n2. Founder Circle retention — 3 members at churn risk, CSM investigating\n3. Fleece restock — 4,800 units, blocked on budget reallocation (PAP-42)\n4. Founder Note No.8 — permanence theme, awaiting publish approval\n\nDecision needed: Approve Q3 budget reallocation from Marketing → Operations.',
    updatedAt: Date.now() - 3600000,
  },
  {
    id: '2',
    title: 'Agent Observations',
    body: 'CMO (Mira) running hot — 68% token budget used. Watch for 80% threshold.\n\nCTO (Vega) deployed Stripe webhook hotfix. Monitor for 24h.\n\nCCO (Lumen) completed brand scan — 0 violations. Excellent discipline.\n\nGrowth (Pulse) — House Access waitlist experiment showing 8.2% conversion lift. Consider scaling.',
    updatedAt: Date.now() - 7200000,
  },
  {
    id: '3',
    title: 'House of Originals — Expansion Ideas',
    body: 'Ideas for future drops:\n\n- Solids: introduce a heavyweight tank in Gulabi Pink\n- Layers: architect\'s drape coat in Noor Black\n- Street: cultural syntax series — Indian modernism graphics\n- Luxe: founder cut jacket — limited 50 pieces\n- Origins: restoration kit as standalone product\n\nAll must stay within six-color system.',
    updatedAt: Date.now() - 86400000,
  },
]

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on client
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setNotes(parsed)
          if (parsed.length > 0) setActiveId(parsed[0].id)
        } else {
          setNotes(SEED_NOTES)
          setActiveId(SEED_NOTES[0].id)
        }
      } catch {
        setNotes(SEED_NOTES)
        setActiveId(SEED_NOTES[0].id)
      }
      setLoaded(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
      } catch {}
    }
  }, [notes, loaded])

  const active = notes.find((n) => n.id === activeId)

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
    : notes

  const createNote = () => {
    const newNote: Note = {
      id: String(Date.now()),
      title: 'New Note',
      body: '',
      updatedAt: Date.now(),
    }
    setNotes([newNote, ...notes])
    setActiveId(newNote.id)
  }

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map((n) => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n))
  }

  const deleteNote = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id)
    setNotes(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id || null)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Notes"
        title="Quick Notes"
        description="Capture observations, decisions, and ideas. Notes persist locally in your browser."
        actions={
          <Button size="sm" className="gap-1.5" onClick={createNote}>
            <Plus className="h-3.5 w-3.5" /> New Note
          </Button>
        }
      />

      <div className="flex h-[560px] border-t border-border">
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
            {filtered.length === 0 ? (
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
                  value={active.title}
                  onChange={(e) => updateNote(active.id, { title: e.target.value })}
                  placeholder="Note title…"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNote(active.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <textarea
                className="flex-1 p-4 bg-background text-sm leading-relaxed resize-none outline-none font-mono"
                value={active.body}
                onChange={(e) => updateNote(active.id, { body: e.target.value })}
                placeholder="Start writing…"
              />
              <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-right">
                {active.body.length} chars · Last edited {timeAgo(active.updatedAt)}
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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
