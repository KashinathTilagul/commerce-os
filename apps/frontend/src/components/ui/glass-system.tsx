'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type GlassLevel = 0 | 1 | 2 | 3 | 4

const GLASS_CLASS: Record<GlassLevel, string> = {
  0: '',
  1: 'glass-l1',
  2: 'glass-l2',
  3: 'glass-l3',
  4: 'glass-l4',
}

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel
  children: ReactNode
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ level = 2, className = '', children, ...rest }, ref) => (
    <div ref={ref} className={`${GLASS_CLASS[level]} ${className}`} {...rest}>
      {children}
    </div>
  ),
)
GlassPanel.displayName = 'GlassPanel'
