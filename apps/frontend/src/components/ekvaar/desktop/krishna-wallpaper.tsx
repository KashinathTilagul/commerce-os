'use client'

import { motion } from 'framer-motion'
import { useKrishnaState } from './jarvis'

const STATE_LIQUID_GRADIENT: Record<string, { bg: string; glow: string; border: string }> = {
  idle: {
    bg: 'radial-gradient(circle at 35% 35%, rgba(245, 241, 234, 0.45) 0%, rgba(31, 58, 95, 0.38) 45%, rgba(10, 10, 10, 0.85) 100%)',
    glow: 'rgba(31, 58, 95, 0.4)',
    border: 'rgba(255, 255, 255, 0.28)',
  },
  listening: {
    bg: 'radial-gradient(circle at 40% 30%, rgba(255, 120, 150, 0.65) 0%, rgba(200, 48, 42, 0.5) 50%, rgba(10, 10, 10, 0.9) 100%)',
    glow: 'rgba(200, 48, 42, 0.5)',
    border: 'rgba(255, 180, 200, 0.45)',
  },
  thinking: {
    bg: 'radial-gradient(circle at 30% 40%, rgba(168, 85, 247, 0.65) 0%, rgba(56, 189, 248, 0.5) 50%, rgba(10, 10, 10, 0.9) 100%)',
    glow: 'rgba(168, 85, 247, 0.5)',
    border: 'rgba(216, 180, 254, 0.45)',
  },
  talking: {
    bg: 'radial-gradient(circle at 35% 35%, rgba(52, 211, 153, 0.65) 0%, rgba(31, 58, 95, 0.55) 50%, rgba(10, 10, 10, 0.9) 100%)',
    glow: 'rgba(52, 211, 153, 0.5)',
    border: 'rgba(167, 243, 208, 0.45)',
  },
}

export function KrishnaWallpaper({ onActivate }: { onActivate: () => void }) {
  const state = useKrishnaState()
  const theme = STATE_LIQUID_GRADIENT[state] || STATE_LIQUID_GRADIENT.idle

  return (
    <section className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden" aria-label="Krishna liquid desktop intelligence">
      {/* Background Soft Liquid Glass Ambient Glow */}
      <motion.div
        className="absolute h-[540px] w-[540px] rounded-full filter blur-3xl opacity-40 pointer-events-none"
        style={{ background: theme.glow }}
        animate={{
          scale: state === 'listening' ? [1, 1.25, 1] : state === 'talking' ? [1, 1.18, 1] : [1, 1.08, 1],
          opacity: state === 'idle' ? [0.25, 0.45, 0.25] : 0.6,
        }}
        transition={{ duration: state === 'listening' ? 1.2 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main Apple Liquid Glass Intelligence Sphere */}
      <motion.button
        type="button"
        onClick={onActivate}
        className="pointer-events-auto group relative flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-full outline-none backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all duration-700"
        style={{
          background: theme.bg,
          border: `1px solid ${theme.border}`,
        }}
        animate={{
          scale: state === 'listening' ? [1, 1.04, 1] : state === 'talking' ? [1, 1.03, 1] : [1, 1.015, 1],
          rotate: state === 'thinking' ? 360 : 0,
        }}
        transition={{
          scale: { duration: state === 'listening' ? 0.9 : 2.5, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 14, repeat: Infinity, ease: 'linear' },
        }}
        title="Summon Krishna AI"
      >
        {/* Organic Inner Liquid Lens Refraction */}
        <div className="absolute inset-2 rounded-full border border-white/20 bg-gradient-to-b from-white/15 via-transparent to-black/20 pointer-events-none" />

        {/* Subtle Liquid Core Light */}
        <motion.div
          className="h-28 w-28 rounded-full bg-white/20 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.5)]"
          animate={{
            scale: state === 'idle' ? [0.9, 1.1, 0.9] : state === 'listening' ? [1, 1.3, 1] : [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{ duration: state === 'listening' ? 0.8 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.button>
    </section>
  )
}
