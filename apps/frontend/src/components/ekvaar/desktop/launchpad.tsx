'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { APPS } from './app-registry'
import { AppIcon } from './app-icon'
import { useWindowStore } from '@/lib/window-store'
import { useAppVisibilityStore } from '@/lib/app-visibility-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LaunchpadProps {
  open: boolean
  onClose: () => void
}

export function Launchpad({ open, onClose }: LaunchpadProps) {
  const { open: openWindow } = useWindowStore()
  const store = useAppVisibilityStore()
  const customNames = store.customNames || {}
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    if (!open) {
      const raf = requestAnimationFrame(() => setSearch(''))
      return () => cancelAnimationFrame(raf)
    }
  }, [open])

  // Launchpad ALWAYS shows ALL apps — no hiding, no editing.
  // It's purely a launcher. Hiding/removing apps is done ONLY in the dock.
  const allApps = useMemo(() => {
    return APPS.filter((a) => {
      const name = customNames[a.id] || a.name
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, customNames])

  const handleAppClick = (appId: any, appName: string) => {
    openWindow(appId, customNames[appId] || appName)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9500] flex flex-col"
          style={{
            background: 'rgba(10, 10, 10, 0.75)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
          onClick={onClose}
        >
          {/* Search bar only — no Edit button, no edit mode */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-3 pt-8 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
              <Input
                placeholder="Search apps…"
                className="pl-9 h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* App grid — all apps always visible, no edit mode, no hiding */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 28 }}
            className="flex-1 overflow-y-auto px-8 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-5xl mx-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-x-4 gap-y-8">
              {allApps.map((app, i) => {
                const displayName = customNames[app.id] || app.name
                return (
                  <motion.div
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.015 }}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                    onClick={() => handleAppClick(app.id, app.name)}
                  >
                    <div className="transition-all group-hover:scale-105 group-hover:-translate-y-1">
                      <AppIcon variant={app.iconVariant} size={72} />
                    </div>
                    <div className="text-xs text-center leading-tight max-w-[100px] truncate text-white/90">
                      {displayName}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {allApps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/60">
                <Search className="h-10 w-10 mb-3 opacity-40" />
                <div className="text-sm">No apps match your search.</div>
                {search && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-white/10 border-white/20 text-white"
                    onClick={() => setSearch('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </motion.div>

          {/* Footer hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center pb-6 text-[10px] text-white/40"
          >
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">F4</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">⌘L</kbd> to toggle · <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Esc</kbd> to close
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
