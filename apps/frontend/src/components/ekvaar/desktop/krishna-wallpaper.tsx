'use client'

import { motion } from 'framer-motion'
import { useKrishnaState } from './jarvis'

const radialMarks = Array.from({ length: 48 }, (_, index) => index)
const particles = Array.from({ length: 120 }, (_, index) => {
  const angle = index * 2.399963229728653
  const radius = 138 + ((index * 43) % 150)
  return {
    cx: 300 + Math.cos(angle) * radius,
    cy: 300 + Math.sin(angle) * radius,
    delay: (index % 13) * 0.12,
    size: index % 9 === 0 ? 2.6 : index % 4 === 0 ? 1.7 : 1.1,
  }
})

export function KrishnaWallpaper({ onActivate }: { onActivate: () => void }) {
  const state = useKrishnaState()
  const active = state !== 'idle'
  const speed = state === 'thinking' ? 4 : state === 'listening' ? 7 : 18

  return (
    <section className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-label="Krishna desktop intelligence interface">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12)_0%,transparent_28%),radial-gradient(ellipse_at_50%_100%,rgba(8,47,73,0.34),transparent_60%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(103,232,249,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.035)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="absolute left-1/2 top-1/2 h-[min(58vw,560px)] w-[min(58vw,560px)] min-h-[280px] min-w-[280px] -translate-x-1/2 -translate-y-1/2">
        <motion.button
          type="button"
          onClick={onActivate}
          className="pointer-events-auto relative h-full w-full rounded-full outline-none"
          animate={{ scale: state === 'listening' ? [1, 1.018, 1] : 1 }}
          transition={{ duration: 0.8, repeat: state === 'listening' ? Infinity : 0 }}
          title="Open Krishna"
        >
          <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <radialGradient id="krishna-core" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.98" />
                <stop offset="14%" stopColor="#22d3ee" stopOpacity="0.94" />
                <stop offset="42%" stopColor="#0e7490" stopOpacity="0.82" />
                <stop offset="78%" stopColor="#061923" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#020617" stopOpacity="1" />
              </radialGradient>
              <filter id="krishna-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle cx="300" cy="300" r="274" fill="none" stroke="rgba(165,243,252,0.18)" strokeWidth="1" />
            <circle cx="300" cy="300" r="247" fill="none" stroke="rgba(103,232,249,0.3)" strokeWidth="1" strokeDasharray="2 13" />
            <motion.g animate={{ rotate: 360 }} transition={{ duration: speed, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '300px 300px' }}>
              {radialMarks.map((mark) => {
                const angle = mark * 7.5
                const major = mark % 4 === 0
                return <line key={mark} x1="300" y1={major ? 34 : 44} x2="300" y2={major ? 52 : 48} stroke={major ? 'rgba(165,243,252,0.88)' : 'rgba(103,232,249,0.42)'} strokeWidth={major ? 2 : 1} transform={`rotate(${angle} 300 300)`} />
              })}
            </motion.g>
            <motion.g animate={{ rotate: -360 }} transition={{ duration: speed * 1.7, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '300px 300px' }}>
              <path d="M300 70 A230 230 0 0 1 513 214" fill="none" stroke="rgba(34,211,238,0.85)" strokeWidth="3" strokeDasharray="58 14 4 10" />
              <path d="M87 386 A230 230 0 0 1 180 110" fill="none" stroke="rgba(165,243,252,0.42)" strokeWidth="2" strokeDasharray="24 14" />
            </motion.g>
            <motion.g animate={{ rotate: active ? 360 : 0 }} transition={{ duration: speed * 1.25, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '300px 300px' }}>
              <ellipse cx="300" cy="300" rx="230" ry="106" fill="none" stroke="rgba(34,211,238,0.36)" strokeWidth="1.4" transform="rotate(-31 300 300)" />
              <ellipse cx="300" cy="300" rx="205" ry="82" fill="none" stroke="rgba(165,243,252,0.24)" strokeWidth="1" transform="rotate(43 300 300)" />
            </motion.g>
            <g>
              {particles.map((particle, index) => (
                <motion.circle
                  key={index}
                  cx={particle.cx}
                  cy={particle.cy}
                  r={particle.size}
                  fill={index % 10 === 0 ? '#cffafe' : '#22d3ee'}
                  animate={{ opacity: active ? [0.15, 0.95, 0.22] : [0.12, 0.6, 0.12], r: [particle.size * 0.65, particle.size, particle.size * 0.65] }}
                  transition={{ duration: active ? 1.1 + (index % 5) * 0.16 : 3 + (index % 5) * 0.25, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </g>
            <circle cx="300" cy="300" r="191" fill="rgba(2,12,20,0.25)" stroke="rgba(103,232,249,0.42)" strokeWidth="1" />
            <circle cx="300" cy="300" r="168" fill="none" stroke="rgba(103,232,249,0.24)" strokeWidth="1" strokeDasharray="8 12" />
            <path d="M300 105 L314 121 L300 137 L286 121 Z" fill="rgba(165,243,252,0.9)" filter="url(#krishna-glow)" />
            <path d="M495 300 L479 314 L463 300 L479 286 Z" fill="rgba(165,243,252,0.55)" />
            <path d="M300 495 L286 479 L300 463 L314 479 Z" fill="rgba(165,243,252,0.55)" />
            <path d="M105 300 L121 286 L137 300 L121 314 Z" fill="rgba(165,243,252,0.55)" />
            <motion.circle cx="300" cy="300" r="128" fill="url(#krishna-core)" stroke="rgba(207,250,254,0.92)" strokeWidth="1.5" filter="url(#krishna-glow)"
              animate={{ opacity: active ? [0.9, 1, 0.9] : 0.9 }} transition={{ duration: 1.1, repeat: active ? Infinity : 0 }} />
            <circle cx="300" cy="300" r="100" fill="none" stroke="rgba(207,250,254,0.72)" strokeWidth="1" strokeDasharray="3 7" />
            <circle cx="300" cy="300" r="68" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
            <circle cx="300" cy="300" r="24" fill="#020617" stroke="rgba(207,250,254,0.95)" strokeWidth="2" />
            <circle cx="300" cy="300" r="7" fill="#ecfeff" filter="url(#krishna-glow)" />
          </svg>

          <span className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent" />
          <span className="absolute left-1/2 top-1/2 h-[72%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-100/30 to-transparent" />
        </motion.button>
      </div>
    </section>
  )
}
