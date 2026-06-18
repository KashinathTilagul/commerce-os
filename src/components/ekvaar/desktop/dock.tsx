'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWindowStore, type AppId } from '@/lib/window-store'
import { APPS, CORE_APP_IDS, UTILITY_APP_IDS, BUSINESS_APP_IDS } from './app-registry'
import { AppIcon } from './app-icon'

export function Dock() {
  const { open, windows, activeId, focus } = useWindowStore()
  const [hovered, setHovered] = useState<AppId | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [centers, setCenters] = useState<Record<string, number>>({})
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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
    // Defer measurement to next frame so refs are mounted
    const raf = requestAnimationFrame(() => {
      measure()
    })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX)
  }

  const handleClick = (id: AppId) => {
    const existing = windows.find((w) => w.id === id)
    if (existing) {
      focus(id)
    } else {
      open(id, APPS.find((a) => a.id === id)!.name)
    }
  }

  return (
    <div className="fixed bottom-1 left-0 right-0 z-[8000] flex justify-center pointer-events-none">
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
        {APPS.filter(a => CORE_APP_IDS.includes(a.id)).map((app) => {
          const isOpen = windows.some((w) => w.id === app.id)
          const isActive = activeId === app.id
          return (
            <DockItem
              key={app.id}
              app={app}
              isOpen={isOpen}
              isActive={isActive}
              hovered={hovered}
              setHovered={setHovered}
              mouseX={mouseX}
              center={centers[app.id]}
              setRef={(el) => {
                itemRefs.current[app.id] = el
              }}
              onClick={() => handleClick(app.id)}
            />
          )
        })}

        {/* Divider between Core OS and Utilities */}
        <div className="w-px h-12 bg-white/15 mx-1 self-center" />

        {APPS.filter(a => UTILITY_APP_IDS.includes(a.id)).map((app) => {
          const isOpen = windows.some((w) => w.id === app.id)
          const isActive = activeId === app.id
          return (
            <DockItem
              key={app.id}
              app={app}
              isOpen={isOpen}
              isActive={isActive}
              hovered={hovered}
              setHovered={setHovered}
              mouseX={mouseX}
              center={centers[app.id]}
              setRef={(el) => {
                itemRefs.current[app.id] = el
              }}
              onClick={() => handleClick(app.id)}
            />
          )
        })}

        {/* Divider between Utilities and Business apps */}
        <div className="w-px h-12 bg-white/15 mx-1 self-center" />

        {APPS.filter(a => BUSINESS_APP_IDS.includes(a.id)).map((app) => {
          const isOpen = windows.some((w) => w.id === app.id)
          const isActive = activeId === app.id
          return (
            <DockItem
              key={app.id}
              app={app}
              isOpen={isOpen}
              isActive={isActive}
              hovered={hovered}
              setHovered={setHovered}
              mouseX={mouseX}
              center={centers[app.id]}
              setRef={(el) => {
                itemRefs.current[app.id] = el
              }}
              onClick={() => handleClick(app.id)}
            />
          )
        })}

        {/* Divider before Brand Book */}
        <div className="w-px h-12 bg-white/15 mx-1 self-center" />

        {/* Brand Book */}
        <DockItem
          app={{
            id: 'guardian' as AppId,
            name: 'Brand Book',
            shortName: 'Book',
            icon: null,
            iconVariant: 'brand-book',
            gradient: 'linear-gradient(135deg, #F5F1EA 0%, #C8B89F 100%)',
            glyphColor: '#0A0A0A',
            component: null as any,
            menuItems: [],
          }}
          isOpen={false}
          isActive={false}
          hovered={hovered}
          setHovered={setHovered}
          mouseX={mouseX}
          center={centers['brand-book'] || 0}
          setRef={(el) => {
            itemRefs.current['brand-book'] = el
          }}
          onClick={() => open('guardian', 'Brand Guardian')}
          isTrash
        />
      </motion.div>
    </div>
  )
}

function DockItem({
  app,
  isOpen,
  isActive,
  hovered,
  setHovered,
  mouseX,
  center,
  setRef,
  onClick,
  isTrash,
}: {
  app: any
  isOpen: boolean
  isActive: boolean
  hovered: AppId | null
  setHovered: (v: AppId | null) => void
  mouseX: number | null
  center: number
  setRef: (el: HTMLButtonElement | null) => void
  onClick: () => void
  isTrash?: boolean
}) {
  const baseSize = 50
  const maxScale = 1.6
  const range = 90

  let scale = 1
  if (mouseX !== null && center > 0) {
    const dist = Math.abs(mouseX - center)
    if (dist < range) {
      const t = 1 - dist / range
      scale = 1 + (maxScale - 1) * Math.pow(t, 1.5)
    }
  }

  const isHovered = hovered === app.id
  const showLabel = isHovered && scale > 1.1

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

      <motion.button
        ref={setRef}
        onClick={onClick}
        onMouseEnter={() => setHovered(app.id)}
        whileTap={{ scale: 0.92 }}
        animate={{
          scale,
          y: scale > 1 ? -((scale - 1) * baseSize) * 0.35 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
        className="relative origin-bottom"
        style={{ width: baseSize, height: baseSize }}
      >
        <AppIcon
          variant={app.iconVariant || 'generic'}
          size={baseSize}
        />
      </motion.button>

      {/* Active indicator dot */}
      <div
        className="mt-1 h-1 w-1 rounded-full transition-opacity"
        style={{
          background: 'rgba(255,255,255,0.85)',
          opacity: isOpen ? 1 : 0,
        }}
      />
    </div>
  )
}
