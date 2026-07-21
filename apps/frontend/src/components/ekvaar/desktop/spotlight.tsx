'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command } from 'lucide-react'
import { APPS } from './app-registry'

const APP_BY_ID = new Map(APPS.map(a => [a.id, a]))
import { AppIcon } from './app-icon'
import { useWindowStore } from '@/lib/window-store'

interface SpotlightProps {
  open: boolean
  onClose: () => void
}

const QUICK_ACTIONS = [
  { label: 'Board Room', id: 'command', hint: 'Dashboard & KPIs' },
  { label: 'Finance', id: 'finance', hint: 'P&L, cash, ledger' },
  { label: 'Sales & Orders', id: 'sales', hint: 'Orders & fulfilment' },
  { label: 'Integrations', id: 'integrations', hint: 'Connect tools' },
]

export function Spotlight({ open, onClose }: SpotlightProps) {
  const openWindow = useWindowStore(s => s.open)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return QUICK_ACTIONS.map(a => ({ ...APP_BY_ID.get(a.id as any)!, hint: a.hint })).filter(Boolean)
    return APPS
      .filter(a => a.name.toLowerCase().includes(q) || a.shortName.toLowerCase().includes(q))
      .slice(0, 8)
      .map(a => ({ ...a, hint: a.menuItems?.[0]?.items?.[0] || '' }))
  }, [query])

  useEffect(() => { setSelected(0) }, [results])

  const handleSelect = useCallback((id: string, name: string) => {
    openWindow(id as any, name)
    onClose()
  }, [openWindow, onClose])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) {
      handleSelect(results[selected].id, results[selected].name)
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9800]"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed z-[9900] left-1/2 -translate-x-1/2"
            style={{ top: '15vh', width: 600, maxWidth: '90vw' }}
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'rgba(18,18,20,0.92)',
                backdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                <Search className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search apps, actions…"
                  className="flex-1 bg-transparent text-white/90 text-[15px] outline-none placeholder:text-white/25"
                />
                <kbd className="text-[10px] text-white/25 px-1.5 py-0.5 rounded border border-white/10 font-mono">ESC</kbd>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="py-2 max-h-80 overflow-y-auto">
                  {!query && (
                    <div className="px-4 py-1.5 text-[10px] text-white/25 tracking-wider uppercase">
                      Suggested
                    </div>
                  )}
                  {results.map((app, i) => (
                    <button
                      key={app.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                        i === selected ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => handleSelect(app.id, app.name)}
                      onMouseEnter={() => setSelected(i)}
                    >
                      <AppIcon variant={app.iconVariant} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/90 font-medium">{app.name}</div>
                        {app.hint && <div className="text-[11px] text-white/35 truncate">{app.hint}</div>}
                      </div>
                      {i === selected && (
                        <kbd className="text-[10px] text-white/25 px-1.5 py-0.5 rounded border border-white/10 font-mono shrink-0">↵</kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query && results.length === 0 && (
                <div className="py-8 text-center text-sm text-white/30">No results for "{query}"</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
