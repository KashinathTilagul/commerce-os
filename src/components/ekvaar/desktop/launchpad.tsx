'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Edit3, Trash2, RotateCcw, Check, Eye, EyeOff } from 'lucide-react'
import { APPS } from './app-registry'
import { AppIcon } from './app-icon'
import { useWindowStore } from '@/lib/window-store'
import { useAppVisibilityStore } from '@/lib/app-visibility-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from './toast'

interface LaunchpadProps {
  open: boolean
  onClose: () => void
}

export function Launchpad({ open, onClose }: LaunchpadProps) {
  const { open: openWindow } = useWindowStore()
  const { hiddenApps, customNames, toggleApp, renameApp, resetAll } = useAppVisibilityStore()
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Reset state when launchpad closes
  useEffect(() => {
    if (!open) {
      const raf = requestAnimationFrame(() => {
        setSearch('')
        setEditMode(false)
        setRenamingId(null)
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [open])

  const visibleApps = useMemo(() => {
    return APPS.filter((a) => {
      if (hiddenApps.includes(a.id) && !editMode) return false
      const name = customNames[a.id] || a.name
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [hiddenApps, editMode, search, customNames])

  const hiddenCount = hiddenApps.length

  const handleAppClick = (appId: any, appName: string) => {
    if (editMode) {
      // Toggle visibility in edit mode
      toggleApp(appId)
      const isHidden = hiddenApps.includes(appId)
      toast.info(isHidden ? 'App shown' : 'App hidden', `${customNames[appId] || appName} ${isHidden ? 'restored to' : 'removed from'} dock & launchpad`)
    } else {
      openWindow(appId, customNames[appId] || appName)
      onClose()
    }
  }

  const handleRename = (appId: string) => {
    if (renameValue.trim()) {
      renameApp(appId, renameValue.trim())
      toast.success('App renamed', `${renameValue.trim()}`)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleReset = () => {
    resetAll()
    toast.info('Reset complete', 'All apps restored to defaults')
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
          {/* Top bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-3 pt-8 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
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

            {/* Edit toggle */}
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className={`gap-1.5 h-9 ${editMode ? 'bg-white text-black' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              onClick={() => setEditMode(!editMode)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              {editMode ? 'Done' : 'Edit'}
            </Button>

            {editMode && hiddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ({hiddenCount} hidden)
              </Button>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Edit mode banner */}
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto max-w-2xl px-4 py-2 mb-2 text-center">
                  <div className="text-xs text-white/70">
                    {hiddenCount > 0
                      ? `${hiddenCount} app${hiddenCount === 1 ? '' : 's'} hidden · Click an app to toggle · Hidden apps stay accessible here in edit mode`
                      : 'Click any app to hide it from the dock and launchpad · Renames persist locally'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* App grid */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 28 }}
            className="flex-1 overflow-y-auto px-8 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-5xl mx-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-x-4 gap-y-8">
              {visibleApps.map((app, i) => {
                const displayName = customNames[app.id] || app.name
                const isHidden = hiddenApps.includes(app.id)
                const isRenaming = renamingId === app.id
                return (
                  <motion.div
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.015 }}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                    onClick={() => !isRenaming && handleAppClick(app.id, app.name)}
                  >
                    <div className="relative">
                      <div
                        className={`transition-all ${isHidden ? 'opacity-30 grayscale' : ''} ${
                          editMode ? 'group-hover:scale-95' : 'group-hover:scale-105 group-hover:-translate-y-1'
                        }`}
                      >
                        <AppIcon variant={app.iconVariant} size={72} />
                      </div>

                      {/* Edit mode badges */}
                      {editMode && (
                        <>
                          {/* Remove / restore indicator */}
                          <div
                            className={`absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                              isHidden
                                ? 'bg-arav text-white'
                                : 'bg-agni text-white opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isHidden ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3 w-3" />}
                          </div>

                          {/* Rename indicator */}
                          <div
                            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-neel text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRenamingId(app.id)
                              setRenameValue(displayName)
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </div>

                          {/* Hidden eye indicator */}
                          {isHidden && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <EyeOff className="h-6 w-6 text-white/60" />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Label / rename input */}
                    {isRenaming ? (
                      <input
                        className="text-xs text-white bg-white/20 border border-white/40 rounded px-1.5 py-0.5 text-center w-full max-w-[100px] outline-none"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(app.id)
                          if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                        }}
                        onBlur={() => handleRename(app.id)}
                      />
                    ) : (
                      <div
                        className={`text-xs text-center leading-tight max-w-[100px] truncate ${
                          editMode && isHidden ? 'text-white/40 line-through' : 'text-white/90'
                        }`}
                        onDoubleClick={(e) => {
                          if (editMode) {
                            e.stopPropagation()
                            setRenamingId(app.id)
                            setRenameValue(displayName)
                          }
                        }}
                      >
                        {displayName}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Empty state */}
            {visibleApps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/60">
                <EyeOff className="h-10 w-10 mb-3 opacity-40" />
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

            {/* Hidden apps section in edit mode */}
            {editMode && hiddenCount > 0 && (
              <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-white/10">
                <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-4 text-center">
                  Hidden Apps · Click to restore
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-x-4 gap-y-6">
                  {APPS.filter((a) => hiddenApps.includes(a.id)).map((app) => (
                    <motion.div
                      key={app.id}
                      layout
                      className="flex flex-col items-center gap-2 group cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                      onClick={() => handleAppClick(app.id, app.name)}
                    >
                      <div className="relative">
                        <AppIcon variant={app.iconVariant} size={56} />
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-arav text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="text-[10px] text-white/70 text-center truncate max-w-[90px]">
                        {customNames[app.id] || app.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Footer hint */}
          {!editMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center pb-6 text-[10px] text-white/40"
            >
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">F4</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">⌘L</kbd> to toggle · Click <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Edit</kbd> to manage apps · <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Esc</kbd> to close
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
