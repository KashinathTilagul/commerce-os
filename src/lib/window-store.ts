'use client'

import { create } from 'zustand'

export type AppId =
  | 'command'
  | 'inbox'
  | 'agents'
  | 'issues'
  | 'terminal'
  | 'house'
  | 'sales'
  | 'finance'
  | 'inventory'
  | 'community'
  | 'campaigns'
  | 'guardian'
  | 'ai'

export interface WindowState {
  id: AppId
  title: string
  isMinimized: boolean
  isMaximized: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  prevPosition?: { x: number; y: number }
  prevSize?: { width: number; height: number }
}

interface WindowStore {
  windows: WindowState[]
  activeId: AppId | null
  topZ: number
  bootDone: boolean

  open: (id: AppId, title: string) => void
  close: (id: AppId) => void
  focus: (id: AppId) => void
  minimize: (id: AppId) => void
  toggleMaximize: (id: AppId) => void
  move: (id: AppId, position: { x: number; y: number }) => void
  resize: (id: AppId, size: { width: number; height: number }) => void
  setBootDone: (v: boolean) => void
}

const DEFAULT_SIZES: Record<AppId, { width: number; height: number }> = {
  command: { width: 1180, height: 760 },
  inbox: { width: 1100, height: 720 },
  agents: { width: 1180, height: 780 },
  issues: { width: 1280, height: 760 },
  terminal: { width: 1100, height: 720 },
  house: { width: 1200, height: 780 },
  sales: { width: 1180, height: 720 },
  finance: { width: 1180, height: 760 },
  inventory: { width: 1180, height: 760 },
  community: { width: 1180, height: 760 },
  campaigns: { width: 1180, height: 760 },
  guardian: { width: 1180, height: 760 },
  ai: { width: 1180, height: 760 },
}

function offsetFor(idx: number): { x: number; y: number } {
  // Cascade new windows
  const baseX = 120 + (idx % 6) * 36
  const baseY = 80 + (idx % 6) * 28
  return { x: baseX, y: baseY }
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeId: null,
  topZ: 10,
  bootDone: false,

  open: (id, title) => {
    const state = get()
    const existing = state.windows.find((w) => w.id === id)
    if (existing) {
      // Focus + un-minimize
      const newZ = state.topZ + 1
      set({
        activeId: id,
        topZ: newZ,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, isMinimized: false, zIndex: newZ } : w,
        ),
      })
      return
    }
    const newZ = state.topZ + 1
    const idx = state.windows.length
    const win: WindowState = {
      id,
      title,
      isMinimized: false,
      isMaximized: false,
      position: offsetFor(idx),
      size: DEFAULT_SIZES[id] || { width: 1100, height: 700 },
      zIndex: newZ,
    }
    set({
      windows: [...state.windows, win],
      activeId: id,
      topZ: newZ,
    })
  },

  close: (id) => {
    const state = get()
    const remaining = state.windows.filter((w) => w.id !== id)
    const topWin = remaining.filter((w) => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0]
    set({
      windows: remaining,
      activeId: topWin?.id || null,
    })
  },

  focus: (id) => {
    const state = get()
    const win = state.windows.find((w) => w.id === id)
    if (!win) return
    if (win.zIndex === state.topZ && state.activeId === id) return
    const newZ = state.topZ + 1
    set({
      activeId: id,
      topZ: newZ,
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w,
      ),
    })
  },

  minimize: (id) => {
    const state = get()
    const remaining = state.windows
      .filter((w) => w.id !== id)
      .filter((w) => !w.isMinimized)
      .sort((a, b) => b.zIndex - a.zIndex)
    set({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w,
      ),
      activeId: remaining[0]?.id || null,
    })
  },

  toggleMaximize: (id) => {
    const state = get()
    set({
      windows: state.windows.map((w) => {
        if (w.id !== id) return w
        if (w.isMaximized) {
          return {
            ...w,
            isMaximized: false,
            position: w.prevPosition || w.position,
            size: w.prevSize || w.size,
          }
        }
        return {
          ...w,
          isMaximized: true,
          prevPosition: w.position,
          prevSize: w.size,
        }
      }),
    })
  },

  move: (id, position) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, position } : w,
      ),
    })),

  resize: (id, size) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, size } : w,
      ),
    })),

  setBootDone: (v) => set({ bootDone: v }),
}))
