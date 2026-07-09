'use client'

import { useEffect, useState } from 'react'
import { useWindowStore } from '@/lib/window-store'
import { useThemeStore } from '@/lib/theme-store'
import { BootScreen, DesktopWallpaper } from '@/components/ekvaar/desktop/boot-and-wallpaper'
import { MenuBar } from '@/components/ekvaar/desktop/menu-bar'
import { Dock } from '@/components/ekvaar/desktop/dock'
import { WindowFrame } from '@/components/ekvaar/desktop/window-frame'
import { ToastContainer } from '@/components/ekvaar/desktop/toast'
import { Launchpad } from '@/components/ekvaar/desktop/launchpad'
import { Jarvis, JarvisWallpaperOrb } from '@/components/ekvaar/desktop/jarvis'
import { Spotlight } from '@/components/ekvaar/desktop/spotlight'

export default function Home() {
  const { windows, bootDone, open } = useWindowStore()
  const { mode, accent } = useThemeStore()
  const [launchpadOpen, setLaunchpadOpen] = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [jarvisTrigger, setJarvisTrigger] = useState(0)

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

  // Keyboard: Esc to deselect, Cmd+W to close active, F4/Cmd+L for Launchpad
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        const active = useWindowStore.getState().activeId
        if (active) useWindowStore.getState().close(active)
      }
      // Cmd+K or Ctrl+K → Spotlight
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSpotlightOpen((v) => !v)
      }
      // F4 or Cmd+L toggles Launchpad
      if (e.key === 'F4' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l')) {
        e.preventDefault()
        setLaunchpadOpen((v) => !v)
      }
      // Esc closes launchpad or spotlight
      if (e.key === 'Escape') {
        if (spotlightOpen) setSpotlightOpen(false)
        else if (launchpadOpen) setLaunchpadOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [launchpadOpen, spotlightOpen])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DesktopWallpaper />

      {/* Menu bar */}
      <MenuBar
        onSpotlight={() => setSpotlightOpen(true)}
        onKrishna={() => setJarvisTrigger(t => t + 1)}
      />

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
      <Dock onLaunchpad={() => setLaunchpadOpen(true)} onJarvisClick={() => setJarvisTrigger(t => t + 1)} />

      {/* Boot screen overlay */}
      <BootScreen />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Launchpad */}
      <Launchpad open={launchpadOpen} onClose={() => setLaunchpadOpen(false)} />

      {/* Spotlight search */}
      <Spotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />

      {/* Krishna (JARVIS) — living orb on wallpaper + voice panel */}
      <JarvisWallpaperOrb onClick={() => setJarvisTrigger(t => t + 1)} hidden={windows.length > 0} />
      <Jarvis trigger={jarvisTrigger} hasOpenWindows={windows.length > 0} />
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
