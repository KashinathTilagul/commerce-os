'use client'

import { useEffect, useState } from 'react'
import { Apple, Wifi, Battery, Search, Volume2, Sparkles, Cpu, ShieldCheck } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APP_MAP } from './app-registry'
import { motion, AnimatePresence } from 'framer-motion'

export function MenuBar() {
  const { activeId, windows, open } = useWindowStore()
  const [now, setNow] = useState(new Date())
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-open command center on first mount handled by desktop
  const activeApp = activeId ? APP_MAP[activeId] : null

  const handleMenuClick = (label: string) => {
    setOpenMenu(openMenu === label ? null : label)
  }

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div
      className="fixed top-0 left-0 right-0 h-7 z-[9000] flex items-center px-3 text-xs text-white/95 select-none"
      style={{
        background: 'rgba(10, 10, 10, 0.55)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      onPointerLeave={() => setOpenMenu(null)}
    >
      {/* Left cluster */}
      <div className="flex items-center gap-1">
        {/* EKVAAR logo (replaces Apple) */}
        <button
          className="px-2 py-0.5 rounded hover:bg-white/15 transition-colors font-display tracking-tight"
          onClick={() => openMenu === 'ekvaar' ? setOpenMenu(null) : setOpenMenu('ekvaar')}
        >
          <span className="text-[14px] tracking-tighter">EKVAAR</span>
        </button>

        {/* Active app name */}
        <span className="ml-1 font-semibold">
          {activeApp ? activeApp.name : 'Finder'}
        </span>

        {/* App menus */}
        {activeApp?.menuItems.map((menu) => (
          <MenuButton
            key={menu.label}
            label={menu.label}
            isOpen={openMenu === menu.label}
            onClick={() => handleMenuClick(menu.label)}
            items={menu.items}
            onClose={() => setOpenMenu(null)}
          />
        ))}

        {/* Default menus when no app active */}
        {!activeApp && (
          <>
            <MenuButton label="File" isOpen={openMenu === 'File'} onClick={() => handleMenuClick('File')} items={['New Window', 'Close Window']} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Edit" isOpen={openMenu === 'Edit'} onClick={() => handleMenuClick('Edit')} items={['Undo', 'Redo', 'Cut', 'Copy', 'Paste']} onClose={() => setOpenMenu(null)} />
            <MenuButton label="View" isOpen={openMenu === 'View'} onClick={() => handleMenuClick('View')} items={['Show Dock', 'Enter Full Screen']} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Go" isOpen={openMenu === 'Go'} onClick={() => handleMenuClick('Go')} items={['Command Center', 'House of Originals', 'Finance', 'AI Infrastructure']} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Window" isOpen={openMenu === 'Window'} onClick={() => handleMenuClick('Window')} items={['Minimize', 'Zoom']} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Help" isOpen={openMenu === 'Help'} onClick={() => handleMenuClick('Help')} items={['EKVAAR Brand Book', 'Keyboard Shortcuts']} onClose={() => setOpenMenu(null)} />
          </>
        )}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Brand health indicators */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">
          <ShieldCheck className="h-3 w-3 text-arav" style={{ color: '#7CB089' }} />
          <span className="text-[10px]">96%</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">
          <Cpu className="h-3 w-3" style={{ color: '#D4859B' }} />
          <span className="text-[10px]">94%</span>
        </div>
        <div className="h-3 w-px bg-white/20 mx-0.5" />
        <button className="p-1 rounded hover:bg-white/15 transition-colors">
          <Sparkles className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-white/15 transition-colors">
          <Volume2 className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-white/15 transition-colors">
          <Wifi className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-white/15 transition-colors">
          <Search className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-white/15 transition-colors relative">
          <Battery className="h-3 w-3" />
        </button>
        <div className="h-3 w-px bg-white/20 mx-0.5" />
        <span className="text-[11px] tabular-nums">{dateStr}</span>
        <span className="text-[11px] tabular-nums">{timeStr}</span>
      </div>
    </div>
  )
}

function MenuButton({
  label,
  isOpen,
  onClick,
  items,
  onClose,
}: {
  label: string
  isOpen: boolean
  onClick: () => void
  items: string[]
  onClose: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`px-2.5 py-0.5 rounded transition-colors ${
          isOpen ? 'bg-white/20' : 'hover:bg-white/15'
        }`}
      >
        {label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 min-w-[200px] py-1 rounded-md text-[12px] text-white/90 shadow-2xl border border-white/10"
            style={{
              background: 'rgba(28, 28, 28, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
            onClick={onClose}
          >
            {items.map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-1 hover:bg-white/15 transition-colors flex items-center justify-between"
              >
                <span>{item}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
