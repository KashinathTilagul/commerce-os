'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Check } from 'lucide-react'

interface DockContextMenuProps {
  open: boolean
  x: number
  y: number
  appId: string
  appName: string
  isHidden: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onClose: () => void
  onRemove: () => void
  onRestore: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onRename: () => void
}

export function DockContextMenu({
  open, x, y, appId, appName, isHidden,
  canMoveLeft, canMoveRight,
  onClose, onRemove, onRestore, onMoveLeft, onMoveRight, onRename,
}: DockContextMenuProps) {
  // Compute adjusted position inline (menu dimensions estimated)
  const menuW = 200
  const menuH = 280
  const adjX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - menuW - 8) : x
  const adjY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - menuH - 8) : y
  const pos = { x: Math.max(8, adjX), y: Math.max(36, adjY) }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible backdrop to capture outside clicks */}
          <div className="fixed inset-0 z-[9600]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9601] py-1 rounded-lg text-xs text-white/90 shadow-2xl border border-white/10 min-w-[200px]"
            style={{
              left: pos.x,
              top: pos.y,
              background: 'rgba(28, 28, 30, 0.92)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/10 mb-1">
              <div className="text-[10px] tracking-wider uppercase text-white/40">App</div>
              <div className="text-sm font-medium text-white truncate">{appName}</div>
            </div>

            {/* Move actions */}
            <MenuItem
              icon={ChevronLeft}
              label="Move Left"
              disabled={!canMoveLeft}
              onClick={() => { onMoveLeft(); onClose() }}
            />
            <MenuItem
              icon={ChevronRight}
              label="Move Right"
              disabled={!canMoveRight}
              onClick={() => { onMoveRight(); onClose() }}
            />

            <div className="h-px bg-white/10 my-1" />

            {/* Rename */}
            <MenuItem
              icon={Pencil}
              label="Rename"
              onClick={() => { onRename(); onClose() }}
            />

            {/* Hide / Show */}
            {isHidden ? (
              <MenuItem
                icon={Eye}
                label="Show in Dock"
                onClick={() => { onRestore(); onClose() }}
              />
            ) : (
              <MenuItem
                icon={EyeOff}
                label="Hide from Dock"
                onClick={() => { onRemove(); onClose() }}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function MenuItem({
  icon: Icon,
  label,
  disabled,
  onClick,
  danger,
}: {
  icon: any
  label: string
  disabled?: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
        disabled
          ? 'text-white/30 cursor-not-allowed'
          : danger
            ? 'text-agni hover:bg-agni/15'
            : 'text-white/90 hover:bg-white/15'
      }`}
      style={{ color: danger && !disabled ? '#FF6961' : undefined }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  )
}
