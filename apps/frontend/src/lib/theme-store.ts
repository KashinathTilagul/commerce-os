'use client'

import { create } from 'zustand'

type ThemeMode = 'dark' | 'light' | 'auto'

interface ThemeStore {
  mode: ThemeMode
  accent: string
  setMode: (m: ThemeMode) => void
  setAccent: (c: string) => void
}

const ACCENT_KEY = 'ekvaar-accent'
const MODE_KEY = 'ekvaar-mode'

// Default to dark for the desktop aesthetic
export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'dark',
  accent: '#C8302A',
  setMode: (m) => {
    set({ mode: m })
    try { localStorage.setItem(MODE_KEY, m) } catch {}
  },
  setAccent: (c) => {
    set({ accent: c })
    try { localStorage.setItem(ACCENT_KEY, c) } catch {}
  },
}))

export function applyTheme(mode: ThemeMode, accent: string) {
  const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.documentElement.style.setProperty('--accent-color', accent)
}

// Hydrate from localStorage on client mount
if (typeof window !== 'undefined') {
  try {
    const storedMode = localStorage.getItem(MODE_KEY) as ThemeMode | null
    const storedAccent = localStorage.getItem(ACCENT_KEY)
    if (storedMode) useThemeStore.setState({ mode: storedMode })
    if (storedAccent) useThemeStore.setState({ accent: storedAccent })
  } catch {}
}
