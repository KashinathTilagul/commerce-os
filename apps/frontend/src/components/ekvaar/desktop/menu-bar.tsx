'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, Battery, BatteryLow, Search, Volume2, VolumeX, Sparkles, Cpu, ShieldCheck, BatteryMedium, BatteryFull, BatteryCharging } from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'
import { APP_MAP, APPS } from './app-registry'
import { motion, AnimatePresence } from 'framer-motion'

interface MenuBarProps {
  onSpotlight?: () => void
  onKrishna?: () => void
}

export function MenuBar({ onSpotlight, onKrishna }: MenuBarProps) {
  const { activeId, windows, open, close, minimize } = useWindowStore()
  const [now, setNow] = useState<Date | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [showVolume, setShowVolume] = useState(false)

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    if (!('getBattery' in navigator)) return
    ;(navigator as any).getBattery().then((b: any) => {
      const update = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging })
      update()
      b.addEventListener('levelchange', update)
      b.addEventListener('chargingchange', update)
    }).catch(() => {})
  }, [])

  const activeApp = activeId ? APP_MAP[activeId] : null

  const handleMenuClick = (label: string) => setOpenMenu(openMenu === label ? null : label)

  const handleMenuAction = useCallback((item: string) => {
    setOpenMenu(null)
    // Go menu — open apps by name
    const goMap: Record<string, string> = {
      'Board Room': 'command', 'Command Center': 'command',
      'House of Originals': 'house', 'Finance': 'finance',
      'AI Infrastructure': 'ai', 'Digital Employees': 'agents',
      'Sales & Orders': 'sales', 'Integrations': 'integrations',
      'Inventory & Ops': 'inventory', 'Campaigns': 'campaigns',
    }
    if (goMap[item]) { open(goMap[item] as any, item); return }
    // Window actions
    if (item === 'Minimize' && activeId) { minimize(activeId); return }
    if (item === 'Close Window' && activeId) { close(activeId); return }
    if (item === 'Zoom' && activeId) { useWindowStore.getState().toggleMaximize(activeId); return }
    if (item === 'Bring All to Front') {
      // focus the topmost non-minimized window
      const top = [...windows].filter(w => !w.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0]
      if (top) useWindowStore.getState().focus(top.id)
      return
    }
  }, [activeId, open, close, minimize, windows])

  const dateStr = now ? now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'
  const timeStr = now ? now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—:—'

  const BatteryIcon = !battery ? Battery
    : battery.charging ? BatteryCharging
    : battery.level <= 20 ? BatteryLow
    : battery.level <= 50 ? BatteryMedium
    : BatteryFull

  return (
    <div
      className="fixed top-0 left-0 right-0 h-7 z-[9000] flex items-center px-3 text-xs text-white/95 select-none"
      style={{
        background: 'rgba(10,10,10,0.55)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      onPointerLeave={() => { setOpenMenu(null); setShowVolume(false) }}
    >
      {/* Left cluster */}
      <div className="flex items-center gap-1">
        <button
          className="px-2 py-0.5 rounded hover:bg-white/15 transition-colors font-display tracking-tight"
          onClick={() => handleMenuClick('ekvaar')}
        >
          <span className="text-[14px] tracking-tighter">EKVAAR</span>
        </button>

        <span className="ml-1 font-semibold">{activeApp ? activeApp.name : 'Finder'}</span>

        {activeApp?.menuItems.map((menu) => (
          <MenuButton
            key={menu.label}
            label={menu.label}
            isOpen={openMenu === menu.label}
            onClick={() => handleMenuClick(menu.label)}
            items={menu.items}
            onAction={handleMenuAction}
            onClose={() => setOpenMenu(null)}
          />
        ))}

        {!activeApp && (
          <>
            <MenuButton label="File" isOpen={openMenu === 'File'} onClick={() => handleMenuClick('File')}
              items={['New Window', 'Close Window']} onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Edit" isOpen={openMenu === 'Edit'} onClick={() => handleMenuClick('Edit')}
              items={['Undo', 'Redo', 'Cut', 'Copy', 'Paste']} onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
            <MenuButton label="View" isOpen={openMenu === 'View'} onClick={() => handleMenuClick('View')}
              items={['Show Dock', 'Enter Full Screen']} onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Go" isOpen={openMenu === 'Go'} onClick={() => handleMenuClick('Go')}
              items={['Board Room', 'House of Originals', 'Finance', 'Sales & Orders', 'AI Infrastructure']}
              onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Window" isOpen={openMenu === 'Window'} onClick={() => handleMenuClick('Window')}
              items={['Minimize', 'Zoom', 'Bring All to Front']} onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
            <MenuButton label="Help" isOpen={openMenu === 'Help'} onClick={() => handleMenuClick('Help')}
              items={['EKVAAR Brand Book', 'Keyboard Shortcuts']} onAction={handleMenuAction} onClose={() => setOpenMenu(null)} />
          </>
        )}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-0.5">
        {/* Brand health */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">
          <ShieldCheck className="h-3 w-3" style={{ color: '#7CB089' }} />
          <span className="text-[10px]">96%</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">
          <Cpu className="h-3 w-3" style={{ color: '#D4859B' }} />
          <span className="text-[10px]">94%</span>
        </div>

        <div className="h-3 w-px bg-white/20 mx-1" />

        {/* Krishna trigger */}
        <button
          title="Krishna AI"
          onClick={onKrishna}
          className="p-1 rounded hover:bg-white/15 transition-colors"
        >
          <Sparkles className="h-3 w-3 text-purple-300" />
        </button>

        {/* Volume */}
        <div className="relative">
          <button
            title={muted ? 'Unmute' : 'Mute'}
            onClick={() => { setMuted(m => !m); setShowVolume(v => !v) }}
            className="p-1 rounded hover:bg-white/15 transition-colors"
          >
            {muted ? <VolumeX className="h-3 w-3 text-white/50" /> : <Volume2 className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showVolume && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute top-full right-0 mt-1 px-3 py-2 rounded-lg border border-white/10 shadow-xl z-[9100]"
                style={{ background: 'rgba(28,28,28,0.92)', backdropFilter: 'blur(20px)', width: 120 }}
              >
                <div className="text-[10px] text-white/40 mb-1.5 text-center">Volume</div>
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={e => { setVolume(+e.target.value); setMuted(false) }}
                  className="w-full accent-purple-400 h-1"
                />
                <div className="text-[10px] text-white/40 text-center mt-1">{muted ? 'Muted' : `${volume}%`}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WiFi */}
        <button
          title={online ? 'Connected' : 'Offline'}
          className="p-1 rounded hover:bg-white/15 transition-colors"
        >
          {online
            ? <Wifi className="h-3 w-3 text-green-400" />
            : <WifiOff className="h-3 w-3 text-red-400" />
          }
        </button>

        {/* Search / Spotlight */}
        <button
          title="Spotlight (⌘K)"
          onClick={onSpotlight}
          className="p-1 rounded hover:bg-white/15 transition-colors"
        >
          <Search className="h-3 w-3" />
        </button>

        {/* Battery */}
        <button
          title={battery ? `${battery.level}%${battery.charging ? ' · Charging' : ''}` : 'Battery'}
          className="p-1 rounded hover:bg-white/15 transition-colors flex items-center gap-1"
        >
          <BatteryIcon className={`h-3 w-3 ${battery && battery.level <= 20 ? 'text-red-400' : ''}`} />
          {battery && <span className="text-[10px]">{battery.level}%</span>}
        </button>

        <div className="h-3 w-px bg-white/20 mx-1" />
        <span className="text-[11px] tabular-nums">{dateStr}</span>
        <span className="text-[11px] tabular-nums ml-1">{timeStr}</span>
      </div>
    </div>
  )
}

function MenuButton({
  label, isOpen, onClick, items, onAction, onClose,
}: {
  label: string; isOpen: boolean; onClick: () => void
  items: string[]; onAction: (item: string) => void; onClose: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`px-2.5 py-0.5 rounded transition-colors ${isOpen ? 'bg-white/20' : 'hover:bg-white/15'}`}
      >
        {label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 min-w-[200px] py-1 rounded-md text-[12px] text-white/90 shadow-2xl border border-white/10 z-[9100]"
            style={{ background: 'rgba(28,28,28,0.9)', backdropFilter: 'blur(20px) saturate(180%)' }}
          >
            {items.map((item, i) => (
              <button
                key={item}
                onClick={() => onAction(item)}
                className="w-full text-left px-3 py-1.5 hover:bg-white/15 transition-colors"
              >
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
