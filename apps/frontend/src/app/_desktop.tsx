'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useWindowStore } from '@/lib/window-store'
import { useThemeStore } from '@/lib/theme-store'
import { useLockStore } from '@/lib/lock-store'
import { BootScreen, DesktopWallpaper } from '@/components/ekvaar/desktop/boot-and-wallpaper'
import { MenuBar } from '@/components/ekvaar/desktop/menu-bar'
import { LockScreen } from '@/components/ekvaar/desktop/lock-screen'
import { Dock } from '@/components/ekvaar/desktop/dock'
import { WindowFrame } from '@/components/ekvaar/desktop/window-frame'
import { ToastContainer } from '@/components/ekvaar/desktop/toast'
import { Launchpad } from '@/components/ekvaar/desktop/launchpad'
import { Jarvis, JarvisWallpaperOrb } from '@/components/ekvaar/desktop/jarvis'
import { Spotlight } from '@/components/ekvaar/desktop/spotlight'
import { DesktopWidgets } from '@/components/ekvaar/desktop/desktop-widgets'

export default function Desktop() {
  const { status } = useSession()
  const { locked, lock } = useLockStore()
  const { windows, open } = useWindowStore()
  const { mode, accent } = useThemeStore()
  const [launchpadOpen, setLaunchpadOpen] = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [jarvisTrigger, setJarvisTrigger] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
    root.style.setProperty('--accent-color', accent)
  }, [mode, accent])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        const active = useWindowStore.getState().activeId
        if (active) useWindowStore.getState().close(active)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSpotlightOpen((v) => !v)
      }
      if (e.key === 'F4' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l')) {
        e.preventDefault()
        setLaunchpadOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        if (spotlightOpen) setSpotlightOpen(false)
        else if (launchpadOpen) setLaunchpadOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [launchpadOpen, spotlightOpen])

  if (status === 'loading') return <BootScreen />
  if (status === 'unauthenticated' || locked) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <DesktopWallpaper />
        <LockScreen />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DesktopWallpaper />
      <DesktopWidgets />
      <MenuBar
        onSpotlight={() => setSpotlightOpen(true)}
        onKrishna={() => setJarvisTrigger(t => t + 1)}
        onLock={() => lock()}
        onSignOut={() => signOut({ redirect: false })}
        onRestart={() => window.location.reload()}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full pointer-events-none">
          {windows.map((w) => (
            <div key={w.id} className="pointer-events-auto">
              <WindowFrame win={w} />
            </div>
          ))}
        </div>
      </div>
      <Dock onLaunchpad={() => setLaunchpadOpen(true)} onJarvisClick={() => setJarvisTrigger(t => t + 1)} />
      <ToastContainer />
      <Launchpad open={launchpadOpen} onClose={() => setLaunchpadOpen(false)} />
      <Spotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
      <JarvisWallpaperOrb onClick={() => setJarvisTrigger(t => t + 1)} hidden={windows.length > 0} />
      <Jarvis trigger={jarvisTrigger} hasOpenWindows={windows.length > 0} />
    </div>
  )
}
