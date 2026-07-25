'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useWindowStore } from '@/lib/window-store'
import { Brain, Sparkles, CheckCircle2 } from 'lucide-react'

const EMOTIONAL_BOOT_STEPS = [
  'Initializing EKVAAR OS...',
  'Connecting Commerce...',
  'Learning Organization...',
  'Analyzing Operations...',
  'Preparing Executive Brief...',
  '✓ Krishna is ready.',
]

export function BootScreen() {
  const bootDone = useWindowStore(s => s.bootDone)
  const setBootDone = useWindowStore(s => s.setBootDone)
  const openWindow = useWindowStore(s => s.open)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (bootDone) return

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < EMOTIONAL_BOOT_STEPS.length - 1) {
          return prev + 1
        }
        clearInterval(interval)
        setTimeout(() => {
          setBootDone(true)
          // Auto-open Executive Brief window on boot completion!
          openWindow('executive_brief', 'Executive Brief', { width: 1040, height: 720 })
        }, 700)
        return prev
      })
    }, 400)

    return () => clearInterval(interval)
  }, [bootDone, setBootDone, openWindow])

  return (
    <AnimatePresence>
      {!bootDone && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none"
          style={{ background: '#050507' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-sm px-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4859B]/20 to-[#C8302A]/20 border border-[#D4859B]/30 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl">
              <Brain className="w-7 h-7 text-[#D4859B] animate-pulse" />
            </div>

            <div className="font-display text-4xl tracking-tighter mb-1 text-[#F5F1EA]">EKVAAR</div>
            <div className="text-[10px] tracking-[0.4em] uppercase font-mono text-white/40 mb-8">Executive Operating System</div>

            {/* Step Progress Display with Liquid Glass Material */}
            <div className="w-full bg-[#121216]/80 border border-white/10 rounded-2xl p-4 flex flex-col items-start gap-2 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center gap-2.5 text-xs font-mono text-[#D4859B]">
                {currentStep === EMOTIONAL_BOOT_STEPS.length - 1 ? (
                  <CheckCircle2 size={15} className="text-[#4CAF50]" />
                ) : (
                  <Sparkles size={15} className="animate-spin text-[#C8302A]" />
                )}
                <span className="font-medium">{EMOTIONAL_BOOT_STEPS[currentStep]}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#C8302A] via-[#D4859B] to-[#4CAF50]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / EMOTIONAL_BOOT_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DesktopWallpaper() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none material-layer-1">
      <div
        className="absolute inset-0 animate-ambient-shift"
        style={{
          background: `
            radial-gradient(ellipse at 25% 35%, rgba(200, 48, 42, 0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 65%, rgba(31, 58, 95, 0.22) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, rgba(212, 133, 155, 0.10) 0%, transparent 60%),
            linear-gradient(135deg, #070709 0%, #121216 50%, #070709 100%)
          `,
        }}
      />
      {/* Subtle Film Grain Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`
        }}
      />
    </div>
  )
}
