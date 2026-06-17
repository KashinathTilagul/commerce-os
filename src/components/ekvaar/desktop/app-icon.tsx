'use client'

import { motion } from 'framer-motion'

interface AppIconProps {
  gradient: string
  glyphColor: string
  Icon: any
  size?: number
  className?: string
}

export function AppIcon({ gradient, glyphColor, Icon, size = 56, className = '' }: AppIconProps) {
  return (
    <div
      className={`relative rounded-[22%] overflow-hidden flex items-center justify-center shadow-lg ${className}`}
      style={{
        background: gradient,
        width: size,
        height: size,
        boxShadow: '0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
    >
      {/* Glass highlight */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 45%)',
        }}
      />
      <Icon
        className="relative z-10"
        style={{
          color: glyphColor,
          width: size * 0.5,
          height: size * 0.5,
          strokeWidth: 1.75,
        }}
      />
    </div>
  )
}
