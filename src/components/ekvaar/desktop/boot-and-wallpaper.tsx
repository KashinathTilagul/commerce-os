'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useWindowStore } from '@/lib/window-store'

export function BootScreen() {
  const { bootDone, setBootDone, open } = useWindowStore()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t)
          setTimeout(() => {
            setBootDone(true)
            // Auto-open Command Center
            setTimeout(() => open('command', 'Command Center'), 250)
          }, 350)
          return 100
        }
        return p + 8
      })
    }, 80)
    return () => clearInterval(t)
  }, [setBootDone, open])

  return (
    <AnimatePresence>
      {!bootDone && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center"
          style={{
            background: '#0A0A0A',
          }}
        >
          {/* EKVAAR logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-center"
          >
            <div className="font-display text-6xl tracking-tighter text-rui mb-2" style={{ color: '#F5F1EA' }}>
              EKVAAR
            </div>
            <div className="text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(245,241,234,0.5)' }}>
              India ka Original
            </div>
            {/* Color stripes */}
            <div className="flex items-center gap-1 mt-6 justify-center">
              <div className="h-0.5 w-8" style={{ background: '#C8302A' }} />
              <div className="h-0.5 w-8" style={{ background: '#1F3A5F' }} />
              <div className="h-0.5 w-8" style={{ background: '#2F4F3A' }} />
              <div className="h-0.5 w-8" style={{ background: '#D4859B' }} />
              <div className="h-0.5 w-8" style={{ background: '#F5F1EA' }} />
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-32 w-56"
          >
            <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(245,241,234,0.15)' }}>
              <motion.div
                className="h-full"
                style={{ background: '#F5F1EA' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.08 }}
              />
            </div>
            <div className="mt-3 text-center text-[10px] tracking-[0.25em] uppercase" style={{ color: 'rgba(245,241,234,0.4)' }}>
              {progress < 30 ? 'Loading House' : progress < 60 ? 'Restoring Originals' : progress < 100 ? 'Calibrating AI' : 'Entering the House'}
            </div>
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
    >
      {/* Subtle EKVAAR watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.025]"
      >
        <div className="font-display text-[300px] tracking-tighter" style={{ color: '#F5F1EA' }}>
          EKVAAR
        </div>
      </div>

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
