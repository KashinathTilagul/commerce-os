'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppVisibilityStore {
  hiddenApps: string[]
  customNames: Record<string, string>
  hideApp: (id: string) => void
  showApp: (id: string) => void
  toggleApp: (id: string) => void
  renameApp: (id: string, name: string) => void
  resetAll: () => void
}

export const useAppVisibilityStore = create<AppVisibilityStore>()(
  persist(
    (set) => ({
      hiddenApps: [],
      customNames: {},
      hideApp: (id) => set((s) => ({ hiddenApps: [...new Set([...s.hiddenApps, id])] })),
      showApp: (id) => set((s) => ({ hiddenApps: s.hiddenApps.filter((a) => a !== id) })),
      toggleApp: (id) => set((s) => ({
        hiddenApps: s.hiddenApps.includes(id)
          ? s.hiddenApps.filter((a) => a !== id)
          : [...s.hiddenApps, id]
      })),
      renameApp: (id, name) => set((s) => ({ customNames: { ...s.customNames, [id]: name } })),
      resetAll: () => set({ hiddenApps: [], customNames: {} }),
    }),
    { name: 'ekvaar-app-visibility' }
  )
)
