'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, X, Check, Edit3, RotateCcw } from 'lucide-react'
import { useWindowStore, type AppId } from '@/lib/window-store'
import { APPS, CORE_APP_IDS, UTILITY_APP_IDS, BUSINESS_APP_IDS } from './app-registry'
import { AppIcon } from './app-icon'
import { useAppVisibilityStore } from '@/lib/app-visibility-store'
import { DockContextMenu } from './dock-context-menu'
import { toast } from './toast'

interface DockProps {
  onLaunchpad?: () => void
  onJarvisClick?: () => void
}

// All dockable app IDs in default order (Launchpad + all apps + Brand Book)
const DEFAULT_DOCK_ORDER: string[] = [
  'launchpad',
  ...CORE_APP_IDS,
  ...UTILITY_APP_IDS,
  ...BUSINESS_APP_IDS,
  'brand-book',
]

export function Dock({ onLaunchpad, onJarvisClick }: DockProps = {}) {
  const { open, windows, activeId, focus } = useWindowStore()
  const store = useAppVisibilityStore()
  const hiddenApps = store.hiddenApps || []
  const customNames = store.customNames || {}
  const dockOrder = store.dockOrder
  const hideApp = store.hideApp
  const showApp = store.showApp
  const reorderDock = store.reorderDock
  const moveAppLeft = store.moveAppLeft
  const moveAppRight = store.moveAppRight
  const renameApp = store.renameApp
  const resetAll = store.resetAll

  const [hovered, setHovered] = useState<string | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [centers, setCenters] = useState<Record<string, number>>({})
  const [editMode, setEditMode] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean
    x: number
    y: number
    appId: string
    appName: string
    isHidden: boolean
    canMoveLeft: boolean
    canMoveRight: boolean
  } | null>(null)

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Build the effective dock order from store or default
  const effectiveOrder = useMemo(() => {
    if (dockOrder && dockOrder.length > 0) {
      // Filter to only known apps, add any missing new apps at the end
      const known = DEFAULT_DOCK_ORDER.filter(id =>
        dockOrder.includes(id) || id === 'launchpad' || id === 'brand-book'
      )
      // Reorder based on stored order, then append any new apps
      const ordered = dockOrder.filter(id => DEFAULT_DOCK_ORDER.includes(id))
      const missing = DEFAULT_DOCK_ORDER.filter(id => !ordered.includes(id))
      return [...ordered, ...missing]
    }
    return DEFAULT_DOCK_ORDER
  }, [dockOrder])

  // Filter out hidden apps (but keep Launchpad and Brand Book always visible)
  const visibleOrder = useMemo(() => {
    return effectiveOrder.filter(id => {
      if (id === 'launchpad' || id === 'brand-book') return true
      return !hiddenApps.includes(id)
    })
  }, [effectiveOrder, hiddenApps])

  // Build app definitions map for quick lookup
  const appMap = useMemo(() => {
    const m: Record<string, any> = {}
    APPS.forEach(a => { m[a.id] = a })
    // Special entries
    m['launchpad'] = {
      id: 'launchpad', name: 'Launchpad', shortName: 'Apps',
      icon: LayoutGrid, iconVariant: 'launchpad',
      gradient: 'linear-gradient(135deg, #6E6E76 0%, #3A3A3E 100%)',
      glyphColor: '#F5F1EA', component: null, menuItems: [],
    }
    m['brand-book'] = {
      id: 'brand-book', name: 'Brand Book', shortName: 'Book',
      icon: null, iconVariant: 'brand-book',
      gradient: 'linear-gradient(135deg, #F5F1EA 0%, #C8B89F 100%)',
      glyphColor: '#0A0A0A', component: null, menuItems: [],
    }
    return m
  }, [])

  // Measure dock item centers whenever layout changes
  const measure = useCallback(() => {
    const next: Record<string, number> = {}
    for (const [id, el] of Object.entries(itemRefs.current)) {
      if (el) {
        const rect = el.getBoundingClientRect()
        next[id] = rect.left + rect.width / 2
      }
    }
    setCenters(next)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => measure())
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [measure, visibleOrder.length])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) setMouseX(e.clientX)
  }

  const handleClick = (id: string) => {
    if (editMode) return // No clicks in edit mode except remove/rename
    if (id === 'launchpad') {
      onLaunchpad?.()
      return
    }
    if (id === 'brand-book') {
      open('guardian', customNames['guardian'] || 'Brand Guardian')
      return
    }
    const existing = windows.find((w) => w.id === id)
    const appName = customNames[id] || APPS.find(a => a.id === id)?.name || id
    if (existing) {
      focus(id as AppId)
    } else {
      open(id as AppId, appName)
    }
  }

  // Right-click context menu
  const handleContextMenu = (e: React.MouseEvent, appId: string) => {
    e.preventDefault()
    if (appId === 'launchpad' || appId === 'brand-book') return // Can't edit these
    const appName = customNames[appId] || APPS.find(a => a.id === appId)?.name || appId
    const idx = effectiveOrder.indexOf(appId)
    // Find prev/next that are also real apps (not launchpad/brand-book/dividers)
    const realApps = effectiveOrder.filter(id => id !== 'launchpad' && id !== 'brand-book')
    const realIdx = realApps.indexOf(appId)
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      appId,
      appName,
      isHidden: hiddenApps.includes(appId),
      canMoveLeft: realIdx > 0,
      canMoveRight: realIdx < realApps.length - 1,
    })
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    if (!editMode || appId === 'launchpad' || appId === 'brand-book') return
    setDraggingId(appId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', appId)
  }

  const handleDragOver = (e: React.DragEvent, appId: string) => {
    if (!editMode || !draggingId || appId === 'launchpad' || appId === 'brand-book') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== appId) setDragOverId(appId)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!editMode || !draggingId || targetId === 'launchpad' || targetId === 'brand-book') return
    e.preventDefault()
    if (draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const newOrder = [...effectiveOrder]
    const fromIdx = newOrder.indexOf(draggingId)
    const toIdx = newOrder.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggingId)
    reorderDock(newOrder)
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  // Remove app from dock (hide it)
  const handleRemove = (appId: string) => {
    const appName = customNames[appId] || APPS.find(a => a.id === appId)?.name || appId
    hideApp(appId)
    toast.info('Removed from dock', `${appName} hidden — restore via Launchpad > Edit`)
  }

  // Restore app to dock
  const handleRestore = (appId: string) => {
    showApp(appId)
    const appName = customNames[appId] || APPS.find(a => a.id === appId)?.name || appId
    toast.success('Restored to dock', appName)
  }

  // Move left/right
  const handleMoveLeft = (appId: string) => {
    moveAppLeft(appId, effectiveOrder)
    const appName = customNames[appId] || APPS.find(a => a.id === appId)?.name || appId
    toast.info('Moved left', appName)
  }
  const handleMoveRight = (appId: string) => {
    moveAppRight(appId, effectiveOrder)
    const appName = customNames[appId] || APPS.find(a => a.id === appId)?.name || appId
    toast.info('Moved right', appName)
  }

  // Rename
  const handleRename = (appId: string) => {
    setRenamingId(appId)
    setRenameValue(customNames[appId] || APPS.find(a => a.id === appId)?.name || appId)
  }
  const commitRename = (appId: string) => {
    if (renameValue.trim()) {
      renameApp(appId, renameValue.trim())
      toast.success('Renamed', renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  // Reset all
  const handleReset = () => {
    resetAll()
    toast.info('Dock reset', 'All apps restored to default order')
  }

  // Determine section boundaries for dividers
  // We place dividers: after launchpad, after core, after utility, before brand-book
  const isDividerBefore = (id: string, idx: number) => {
    if (id === 'launchpad') return false // first, no divider
    const prev = visibleOrder[idx - 1]
    if (!prev) return false
    // Divider if previous is launchpad (start of core)
    if (prev === 'launchpad') return true
    // Divider if transitioning from core to utility
    if (CORE_APP_IDS.includes(prev as any) && UTILITY_APP_IDS.includes(id as any)) return true
    // Divider if transitioning from utility to business
    if (UTILITY_APP_IDS.includes(prev as any) && BUSINESS_APP_IDS.includes(id as any)) return true
    // Divider before brand-book
    if (id === 'brand-book') return true
    return false
  }

  const realAppsForContext = effectiveOrder.filter(id => id !== 'launchpad' && id !== 'brand-book')

  return (
    <>
      <div className="fixed bottom-1 left-0 right-0 z-[8000] flex justify-center pointer-events-none">
        {/* Edit mode controls — appear above dock */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto"
            >
              <div className="px-3 py-1.5 rounded-md text-[11px] text-white/80 border border-white/15"
                style={{ background: 'rgba(28,28,30,0.9)', backdropFilter: 'blur(20px)' }}
              >
                Dock Edit · Drag to reorder · Click <X className="inline h-3 w-3" /> to remove from dock · Right-click for more options
              </div>
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-md text-[11px] text-white/80 border border-white/15 hover:bg-white/10 transition-colors flex items-center gap-1"
                style={{ background: 'rgba(28,28,30,0.9)', backdropFilter: 'blur(20px)' }}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-2.5 py-1.5 rounded-md text-[11px] text-white border border-white/30 hover:bg-white/20 transition-colors flex items-center gap-1 font-medium"
                style={{ background: 'rgba(28,28,30,0.9)', backdropFilter: 'blur(20px)' }}
              >
                <Check className="h-3 w-3" /> Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHovered(null)
            setMouseX(null)
          }}
          className="pointer-events-auto flex items-end gap-1.5 px-2.5 py-2 rounded-2xl border border-white/10"
          style={{
            background: 'rgba(28, 28, 28, 0.6)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 24 }}
        >
          {visibleOrder.map((appId, idx) => {
            const showDivider = isDividerBefore(appId, idx)
            const app = appMap[appId]
            if (!app) return null
            const isOpen = windows.some((w) => w.id === appId)
            const isActive = activeId === appId
            const isHidden = hiddenApps.includes(appId)
            const isRenaming = renamingId === appId
            const displayName = customNames[appId] || app.name
            const isSpecial = appId === 'launchpad' || appId === 'brand-book'
            const realIdx = realAppsForContext.indexOf(appId)
            const canMoveLeft = !isSpecial && realIdx > 0
            const canMoveRight = !isSpecial && realIdx >= 0 && realIdx < realAppsForContext.length - 1

            return (
              <div key={appId} className="flex items-end">
                {showDivider && (
                  <div className="w-px h-12 bg-white/15 mx-1 self-center" />
                )}
                <DockItem
                  app={{ ...app, name: displayName }}
                  isOpen={isOpen}
                  isActive={isActive}
                  isHidden={isHidden}
                  isRenaming={isRenaming}
                  renameValue={renameValue}
                  editMode={editMode}
                  hovered={hovered}
                  setHovered={setHovered}
                  mouseX={mouseX}
                  center={centers[appId] || 0}
                  isDragging={draggingId === appId}
                  isDragOver={dragOverId === appId}
                  setRef={(el) => { itemRefs.current[appId] = el }}
                  onClick={() => handleClick(appId)}
                  onContextMenu={(e) => handleContextMenu(e, appId)}
                  onRemove={() => handleRemove(appId)}
                  onRename={() => handleRename(appId)}
                  onRenameChange={setRenameValue}
                  onRenameCommit={() => commitRename(appId)}
                  onRenameCancel={() => { setRenamingId(null); setRenameValue('') }}
                  onDragStart={(e) => handleDragStart(e, appId)}
                  onDragOver={(e) => handleDragOver(e, appId)}
                  onDrop={(e) => handleDrop(e, appId)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            )
          })}

          {/* Edit toggle button (always visible at end) */}
          {!editMode && (
            <motion.button
              onClick={() => setEditMode(true)}
              onMouseEnter={() => setHovered('edit' as any)}
              onMouseLeave={() => setHovered(null)}
              className="ml-1 self-center h-9 w-9 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Edit Dock"
            >
              <Edit3 className="h-4 w-4" />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Context menu */}
      <DockContextMenu
        open={contextMenu?.open || false}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        appId={contextMenu?.appId || ''}
        appName={contextMenu?.appName || ''}
        isHidden={contextMenu?.isHidden || false}
        canMoveLeft={contextMenu?.canMoveLeft || false}
        canMoveRight={contextMenu?.canMoveRight || false}
        onClose={() => setContextMenu(null)}
        onRemove={() => contextMenu && handleRemove(contextMenu.appId)}
        onRestore={() => contextMenu && handleRestore(contextMenu.appId)}
        onMoveLeft={() => contextMenu && handleMoveLeft(contextMenu.appId)}
        onMoveRight={() => contextMenu && handleMoveRight(contextMenu.appId)}
        onRename={() => contextMenu && handleRename(contextMenu.appId)}
      />
    </>
  )
}

interface DockItemProps {
  app: any
  isOpen: boolean
  isActive: boolean
  isHidden: boolean
  isRenaming: boolean
  renameValue: string
  editMode: boolean
  hovered: string | null
  setHovered: (v: string | null) => void
  mouseX: number | null
  center: number
  isDragging: boolean
  isDragOver: boolean
  setRef: (el: HTMLButtonElement | null) => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onRemove: () => void
  onRename: () => void
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function DockItem({
  app, isOpen, isActive, isHidden, isRenaming, renameValue,
  editMode, hovered, setHovered, mouseX, center,
  isDragging, isDragOver,
  setRef, onClick, onContextMenu, onRemove, onRename,
  onRenameChange, onRenameCommit, onRenameCancel,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: DockItemProps) {
  const baseSize = 50
  const maxScale = 1.6
  const range = 90

  let scale = 1
  if (!editMode && mouseX !== null && center > 0) {
    const dist = Math.abs(mouseX - center)
    if (dist < range) {
      const t = 1 - dist / range
      scale = 1 + (maxScale - 1) * Math.pow(t, 1.5)
    }
  }

  const isHovered = hovered === app.id
  const showLabel = isHovered && scale > 1.1 && !editMode
  const isSpecial = app.id === 'launchpad' || app.id === 'brand-book'

  return (
    <div className="flex flex-col items-center justify-end relative">
      {/* Tooltip label */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: showLabel ? 1 : 0, y: showLabel ? 0 : 4 }}
        transition={{ duration: 0.12 }}
        className="absolute -top-9 px-2 py-1 rounded-md text-[11px] text-white whitespace-nowrap border border-white/10"
        style={{
          background: 'rgba(20, 20, 20, 0.9)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {app.name}
      </motion.div>

      <motion.div
        ref={setRef as any}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={() => setHovered(app.id)}
        whileTap={!editMode ? { scale: 0.92 } : undefined}
        animate={{
          scale: editMode ? 1 : scale,
          y: editMode ? 0 : (scale > 1 ? -((scale - 1) * baseSize) * 0.35 : 0),
          opacity: isDragging ? 0.4 : (isHidden ? 0.4 : 1),
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
        className="relative origin-bottom"
        role="button"
        tabIndex={0}
        style={{
          width: baseSize,
          height: baseSize,
          cursor: editMode && !isSpecial ? 'grab' : 'pointer',
        }}
        draggable={editMode && !isSpecial}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        onDoubleClick={(e) => {
          if (editMode && !isSpecial) {
            e.stopPropagation()
            onRename()
          }
        }}
      >
        <div className={`relative ${isDragOver ? 'ring-2 ring-white rounded-[22%]' : ''} ${editMode && !isSpecial ? 'animate-pulse-soft' : ''}`}>
          <AppIcon
            variant={app.iconVariant || 'generic'}
            size={baseSize}
          />
        </div>

        {/* Edit mode: remove button */}
        {editMode && !isSpecial && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            onMouseEnter={() => setHovered(null)}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-agni text-white flex items-center justify-center shadow-lg z-20 hover:scale-110 transition-transform"
            style={{ background: '#FF3B30' }}
            title={`Remove ${app.name} from dock`}
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        )}

        {/* Edit mode: rename indicator */}
        {editMode && !isSpecial && !isRenaming && (
          <div
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-neel text-white flex items-center justify-center opacity-70"
            style={{ background: '#1F3A5F' }}
            title="Double-click to rename"
          >
            <Edit3 className="h-2 w-2" />
          </div>
        )}
      </motion.div>

      {/* Rename input (appears below icon when renaming) */}
      {isRenaming && (
        <input
          className="absolute -bottom-7 text-[10px] text-white bg-white/20 border border-white/40 rounded px-1.5 py-0.5 text-center w-24 outline-none z-30"
          value={renameValue}
          autoFocus
          onChange={(e) => onRenameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCancel()
          }}
          onBlur={onRenameCommit}
        />
      )}

      {/* Active indicator dot */}
      <div
        className="mt-1 h-1 w-1 rounded-full transition-opacity"
        style={{
          background: 'rgba(255,255,255,0.85)',
          opacity: isOpen && !editMode ? 1 : 0,
        }}
      />
    </div>
  )
}
