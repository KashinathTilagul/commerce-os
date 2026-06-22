'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppVisibilityStore {
  hiddenApps: string[]
  customNames: Record<string, string>
  // Custom dock order — flat array of app IDs in user-preferred order
  dockOrder: string[] | null
  hideApp: (id: string) => void
  showApp: (id: string) => void
  toggleApp: (id: string) => void
  renameApp: (id: string, name: string) => void
  reorderDock: (newOrder: string[]) => void
  moveAppLeft: (id: string, currentOrder: string[]) => void
  moveAppRight: (id: string, currentOrder: string[]) => void
  resetAll: () => void
}

export const useAppVisibilityStore = create<AppVisibilityStore>()(
  persist(
    (set) => ({
      hiddenApps: [],
      customNames: {},
      dockOrder: null,
      hideApp: (id) => set((s) => ({ hiddenApps: [...new Set([...s.hiddenApps, id])] })),
      showApp: (id) => set((s) => ({ hiddenApps: s.hiddenApps.filter((a) => a !== id) })),
      toggleApp: (id) => set((s) => ({
        hiddenApps: s.hiddenApps.includes(id)
          ? s.hiddenApps.filter((a) => a !== id)
          : [...s.hiddenApps, id]
      })),
      renameApp: (id, name) => set((s) => ({ customNames: { ...s.customNames, [id]: name } })),
      reorderDock: (newOrder) => set({ dockOrder: newOrder }),
      moveAppLeft: (id, currentOrder) => set((s) => {
        const order = s.dockOrder || currentOrder
        const idx = order.indexOf(id)
        if (idx <= 0) return s
        const newOrder = [...order]
        ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
        return { dockOrder: newOrder }
      }),
      moveAppRight: (id, currentOrder) => set((s) => {
        const order = s.dockOrder || currentOrder
        const idx = order.indexOf(id)
        if (idx < 0 || idx >= order.length - 1) return s
        const newOrder = [...order]
        ;[newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]]
        return { dockOrder: newOrder }
      }),
      resetAll: () => set({ hiddenApps: [], customNames: {}, dockOrder: null }),
    }),
    { name: 'ekvaar-app-visibility' }
  )
)

