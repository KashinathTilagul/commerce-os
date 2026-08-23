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

export function normalizeAccent(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : '#C8302A'
}

export function accentForeground(accent: string) {
  const hex = normalizeAccent(accent).slice(1)
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150 ? '#0A0A0A' : '#FFFFFF'
}

export function applyTheme(mode: ThemeMode, accent: string) {
  const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const resolvedAccent = normalizeAccent(accent)
  const foreground = accentForeground(resolvedAccent)
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
  root.style.setProperty('--accent-color', resolvedAccent)
  root.style.setProperty('--primary', resolvedAccent)
  root.style.setProperty('--primary-foreground', foreground)
  root.style.setProperty('--ring', resolvedAccent)
  root.style.setProperty('--chart-1', resolvedAccent)
  root.style.setProperty('--sidebar-primary', resolvedAccent)
  root.style.setProperty('--sidebar-primary-foreground', foreground)
  root.style.setProperty('--accent', `color-mix(in srgb, ${resolvedAccent} 18%, ${isDark ? '#121212' : '#FFFFFF'})`)
  root.style.setProperty('--accent-foreground', resolvedAccent)
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
