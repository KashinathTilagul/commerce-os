'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWindowStore } from '@/lib/window-store'

export function BootScreen() {
  const bootDone = useWindowStore(s => s.bootDone)
  const setBootDone = useWindowStore(s => s.setBootDone)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await fetch('/api/settings')
      if (!r.ok) throw new Error('Failed to fetch settings')
      return r.json()
    },
  })
  const orgName = settings?.organizationName || 'Your Business'

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 800)
    return () => clearTimeout(t)
  }, [setBootDone])

  return (
    <AnimatePresence>
      {!bootDone && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: '#050505' }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="font-display text-5xl tracking-tighter mb-1" style={{ color: '#F5F1EA' }}>{orgName}</div>
            <div className="text-xs tracking-[0.4em] uppercase font-mono" style={{ color: 'rgba(245,241,234,0.5)' }}>Operating System</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DesktopWallpaper() {
  return (
    <div
      className="fixed inset-0 z-0"
      style={{
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(200, 48, 42, 0.18) 0%, transparent 45%),
          radial-gradient(ellipse at 80% 70%, rgba(31, 58, 95, 0.20) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 100%, rgba(212, 133, 155, 0.10) 0%, transparent 55%),
          linear-gradient(135deg, #0A0A0A 0%, #181818 50%, #0A0A0A 100%)
        `,
      }}
    />
  )
}
