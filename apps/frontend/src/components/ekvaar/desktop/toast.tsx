'use client'

import { create } from 'zustand'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  message?: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = { id, duration: 4000, ...t }
    set((s) => s.toasts.some((existing) =>
      existing.kind === toast.kind && existing.title === toast.title && existing.message === toast.message
    ) ? s : { toasts: [...s.toasts, toast] })
    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, toast.duration)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

// Convenience helpers
export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().push({ kind: 'success', title, message }),
  error: (title: string, message?: string) => useToastStore.getState().push({ kind: 'error', title, message }),
  warning: (title: string, message?: string) => useToastStore.getState().push({ kind: 'warning', title, message }),
  info: (title: string, message?: string) => useToastStore.getState().push({ kind: 'info', title, message }),
}

const KIND_META: Record<ToastKind, { color: string; bg: string; icon: any }> = {
  success: { color: '#34C759', bg: 'rgba(52, 199, 89, 0.12)', icon: CheckCircle2 },
  error: { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.12)', icon: XCircle },
  warning: { color: '#FF9500', bg: 'rgba(255, 149, 0, 0.12)', icon: AlertCircle },
  info: { color: '#5AC8FA', bg: 'rgba(90, 200, 250, 0.12)', icon: Info },
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed top-9 right-4 z-[10000] flex flex-col gap-2 pointer-events-none" style={{ width: 360 }}>
      <AnimatePresence>
        {toasts.map((t) => {
          const meta = KIND_META[t.kind]
          const Icon = meta.icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto rounded-lg overflow-hidden border border-white/10"
              style={{
                background: 'rgba(28, 28, 30, 0.92)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-start gap-3 p-3">
                <div
                  className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-sm font-medium text-white">{t.title}</div>
                  {t.message && (
                    <div className="text-xs text-white/60 mt-0.5 leading-relaxed">{t.message}</div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Progress bar */}
              <motion.div
                className="h-0.5"
                style={{ background: meta.color }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (t.duration || 4000) / 1000, ease: 'linear' }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
