'use client'

import { motion } from 'framer-motion'
import { useKrishnaState } from './jarvis'

const STATE_COPY = {
  idle: 'KRISHNA / READY',
  listening: 'KRISHNA / LISTENING',
  thinking: 'KRISHNA / ANALYZING',
  talking: 'KRISHNA / SPEAKING',
} as const

export function KrishnaWallpaper({ onActivate }: { onActivate: () => void }) {
  const state = useKrishnaState()
  const active = state !== 'idle'

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(103,232,249,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 sm:left-[39%]">
        <motion.button
          type="button"
          onClick={onActivate}
          className="pointer-events-auto relative grid h-[min(48vw,430px)] w-[min(48vw,430px)] min-h-[238px] min-w-[238px] place-items-center rounded-full outline-none"
          animate={{ scale: active ? [1, 1.035, 1] : 1 }}
          transition={{ duration: state === 'listening' ? 0.65 : 2.4, repeat: active ? Infinity : 0 }}
          title="Talk to Krishna"
        >
          <div className="absolute inset-0 rounded-full border border-cyan-100/30 shadow-[0_0_60px_rgba(34,211,238,0.18),inset_0_0_60px_rgba(34,211,238,0.08)]" />
          <div className="absolute inset-[4%] rounded-full border border-dashed border-cyan-200/35 [background:repeating-conic-gradient(from_0deg,rgba(103,232,249,0.8)_0deg_1deg,transparent_1deg_9deg)] [mask:radial-gradient(transparent_63%,black_64%)]" />
          <motion.div
            className="absolute inset-[11%] rounded-full border border-cyan-100/25"
            animate={{ rotate: active ? 360 : 0 }}
            transition={{ duration: state === 'thinking' ? 3 : 12, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-[18%] rounded-full border border-cyan-300/25 [background:repeating-conic-gradient(from_18deg,rgba(34,211,238,0.65)_0deg_2deg,transparent_2deg_18deg)] [mask:radial-gradient(transparent_60%,black_62%)]" />
          <motion.div
            className="absolute inset-[27%] rounded-full border border-cyan-100/60 bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,rgba(34,211,238,0.92)_8%,rgba(8,112,161,0.85)_40%,rgba(2,19,38,0.96)_71%)] shadow-[0_0_42px_rgba(34,211,238,0.85),inset_0_0_28px_rgba(255,255,255,0.5)]"
            animate={{ boxShadow: active ? ['0 0 32px rgba(34,211,238,0.55)', '0 0 74px rgba(34,211,238,0.95)', '0 0 32px rgba(34,211,238,0.55)'] : '0 0 32px rgba(34,211,238,0.55)' }}
            transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
          >
            <span className="absolute inset-[16%] rounded-full border border-cyan-50/80" />
            <span className="absolute inset-[31%] rounded-full border border-dashed border-cyan-100/70" />
            <span className="absolute inset-0 grid place-items-center font-mono text-[9px] tracking-[0.3em] text-cyan-50/90">01</span>
          </motion.div>
          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.24em] text-cyan-50/75">{STATE_COPY[state]}</span>
        </motion.button>
      </div>
    </div>
  )
}
