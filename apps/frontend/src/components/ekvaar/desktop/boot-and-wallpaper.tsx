'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useWindowStore } from '@/lib/window-store'

export function BootScreen() {
  const { bootDone, setBootDone, open } = useWindowStore()
  const [phase, setPhase] = useState(0)
  const [progress, setProgress] = useState(0)
  
  const phases = [
    'INITIALIZING AI CORES...',
    'ESTABLISHING NEURAL LINK...',
    'VERIFYING SECURE NETWORK...',
    'WAKING KRISHNA MAINFRAME...',
    'ENTERING THE HOUSE.'
  ]

  useEffect(() => {
    let currentPhase = 0
    let currentProgress = 0
    
    const t = setInterval(() => {
      currentProgress += Math.random() * 4 + 2
      if (currentProgress > 100) currentProgress = 100
      
      setProgress(currentProgress)
      
      const newPhase = Math.min(
        Math.floor((currentProgress / 100) * phases.length),
        phases.length - 1
      )
      
      if (newPhase !== currentPhase) {
        currentPhase = newPhase
        setPhase(currentPhase)
      }
      
      if (currentProgress >= 100) {
        clearInterval(t)
        setTimeout(() => setBootDone(true), 600)
      }
    }, 50)
    
    return () => clearInterval(t)
  }, [setBootDone])

  return (
    <AnimatePresence>
      {!bootDone && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#050505' }}
        >
          {/* Scanning/Glitch Overlay */}
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-20"
            animate={{ 
              backgroundPosition: ['0% 0%', '0% 100%'] 
            }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)'
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="text-center relative z-10"
          >
            <div className="font-display text-[80px] tracking-tighter text-rui mb-1" style={{ color: '#F5F1EA', textShadow: '0 0 40px rgba(245,241,234,0.3)' }}>
              EKVAAR
            </div>
            <div className="text-[11px] tracking-[0.5em] uppercase font-mono" style={{ color: 'rgba(245,241,234,0.6)' }}>
              India ka Original
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-24 w-80 flex flex-col items-center z-10"
          >
            {/* Phase Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px] tracking-[0.3em] font-mono mb-4 text-center h-4"
                style={{ color: 'rgba(245,241,234,0.7)' }}
              >
                {phases[phase]}
              </motion.div>
            </AnimatePresence>

            {/* Futuristic Progress Bar */}
            <div className="w-full h-[1px] relative overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                className="h-full absolute left-0 top-0 bottom-0"
                style={{ 
                  background: 'linear-gradient(90deg, transparent, #F5F1EA, #F5F1EA)',
                  boxShadow: '0 0 10px #F5F1EA'
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            
            {/* Hex Dump / Console log simulation */}
            <div className="mt-4 w-full flex justify-between text-[8px] font-mono opacity-30" style={{ color: '#F5F1EA' }}>
              <span>SYS.BOOT.v2.0.4</span>
              <span>{(progress * 0.01).toFixed(4)} TFLOPS</span>
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
