'use client'

import { useEffect } from 'react'
import { useWindowStore } from '@/lib/window-store'
import { useThemeStore } from '@/lib/theme-store'
import { BootScreen, DesktopWallpaper } from '@/components/ekvaar/desktop/boot-and-wallpaper'
import { MenuBar } from '@/components/ekvaar/desktop/menu-bar'
import { Dock } from '@/components/ekvaar/desktop/dock'
import { WindowFrame } from '@/components/ekvaar/desktop/window-frame'
import { ToastContainer } from '@/components/ekvaar/desktop/toast'

export default function Home() {
  const { windows, bootDone, open } = useWindowStore()
  const { mode, accent } = useThemeStore()

  // Apply theme + accent globally
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
    // Apply accent color as CSS variable
    root.style.setProperty('--accent-color', accent)
  }, [mode, accent])

  // Keyboard: Esc to deselect, Cmd+W to close active (best-effort)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        const active = useWindowStore.getState().activeId
        if (active) useWindowStore.getState().close(active)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DesktopWallpaper />

      {/* Menu bar */}
      <MenuBar />

      {/* Windows layer */}
      <div className="absolute inset-0 top-7 bottom-0 pointer-events-none">
        <div className="relative w-full h-full pointer-events-none">
          {windows.map((w) => (
            <div key={w.id} className="pointer-events-auto">
              <WindowFrame win={w} />
            </div>
          ))}
        </div>
      </div>

      {/* Dock */}
      <Dock />

      {/* Boot screen overlay */}
      <BootScreen />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Welcome overlay when no windows */}
      {bootDone && windows.length === 0 && (
        <WelcomeOverlay onLaunch={() => open('command', 'Board Room')} />
      )}
    </div>
  )
}

function DesktopIcons() {
  const { open } = useWindowStore()
  const icons = [
    { id: 'command' as const, label: 'Command Center', color: '#F5F1EA' },
    { id: 'house' as const, label: 'House of Originals', color: '#1F3A5F' },
    { id: 'finance' as const, label: 'Finance', color: '#2F4F3A' },
  ]
  return (
    <div className="absolute top-12 right-4 z-[10] flex flex-col gap-4 pointer-events-auto w-20">
      {icons.map((icon) => (
        <button
          key={icon.id}
          onDoubleClick={() => open(icon.id, icon.label)}
          onClick={(e) => {
            // Single click selects; double-click opens (macOS pattern)
            // But also open on single click for accessibility
            if (e.detail === 1) {
              // wait for potential double-click
              setTimeout(() => {
                // If no double-click happened, do nothing (macOS behavior)
              }, 200)
            }
          }}
          className="flex flex-col items-center gap-1 group select-none"
        >
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-[11px] font-display tracking-tight border border-white/15 group-hover:border-white/40 group-hover:bg-white/5 transition-all"
            style={{
              background: `linear-gradient(135deg, ${icon.color}40 0%, ${icon.color}20 100%)`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ color: '#F5F1EA' }}>
              {icon.label.split(' ').map((w) => w[0]).join('').slice(0, 3)}
            </span>
          </div>
          <span className="text-[10px] text-white/80 text-center leading-tight font-medium drop-shadow">
            {icon.label}
          </span>
        </button>
      ))}
    </div>
  )
}

function WelcomeOverlay({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="absolute inset-0 top-7 flex items-center justify-center z-[100] pointer-events-auto">
      <div
        className="text-center px-8 py-10 rounded-2xl border border-white/10 max-w-md"
        style={{
          background: 'rgba(20,20,20,0.6)',
          backdropFilter: 'blur(30px)',
        }}
      >
        <div className="font-display text-4xl tracking-tighter text-rui mb-2" style={{ color: '#F5F1EA' }}>
          EKVAAR OS
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: 'rgba(245,241,234,0.5)' }}>
          India ka Original · All-Time Fashion House
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(245,241,234,0.7)' }}>
          The dock below holds 13 apps — 5 core OS apps (Board Room, Founder Inbox, Digital Employees, Issues, Terminal) and 8 business apps. Click any to open a window. The digital C-suite of 12 agents works autonomously; the Inbox surfaces only what needs your attention.
        </p>
        <button
          onClick={onLaunch}
          className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: '#F5F1EA',
            color: '#0A0A0A',
          }}
        >
          Open Board Room
        </button>
      </div>
    </div>
  )
}
