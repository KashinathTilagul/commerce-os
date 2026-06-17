'use client'

import { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="px-4 lg:px-8 pt-8 pb-6 border-b border-border">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-none">{title}</h1>
          {description && (
            <p className="mt-3 text-sm text-muted-foreground text-balance leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-display text-lg tracking-tight">{children}</h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  accent,
  icon,
}: {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
  accent?: string
  icon?: ReactNode
}) {
  const positive = (delta ?? 0) >= 0
  return (
    <div className="arch-card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full w-0.5"
        style={{ background: accent || 'transparent' }}
      />
      <div className="flex items-start justify-between">
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 font-display text-2xl md:text-3xl tracking-tight">
        {value}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded font-mono ${
                positive ? 'bg-arav/10 text-arav' : 'bg-agni/10 text-agni'
              }`}
            >
              {positive ? '+' : ''}{delta}%
            </span>
          )}
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </div>
  )
}

export function ColorDot({ color, size = 12 }: { color: string; size?: number }) {
  const map: Record<string, string> = {
    'Noor Black': '#0A0A0A',
    'Rui White': '#F5F1EA',
    'Agni Red': '#C8302A',
    'Neel Blue': '#1F3A5F',
    'Arav Green': '#2F4F3A',
    'Gulabi Pink': '#D4859B',
  }
  const hex = map[color] || '#888'
  return (
    <span
      className="inline-block rounded-full border border-border"
      style={{
        background: hex,
        width: size,
        height: size,
        boxShadow: color === 'Rui White' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none',
      }}
    />
  )
}

export function HouseBadge({ house }: { house: string }) {
  const styles: Record<string, string> = {
    Solids: 'bg-muted text-foreground border-border',
    Layers: 'bg-neel/10 text-neel border-neel/30',
    Street: 'bg-agni/10 text-agni border-agni/30',
    Luxe: 'bg-noor/10 text-noor dark:text-rui border-noor/30',
    Origins: 'bg-arav/10 text-arav border-arav/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm border ${styles[house] || styles.Solids}`}>
      {house}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    ACTIVE: { color: 'text-arav', bg: 'bg-arav/10' },
    PASS: { color: 'text-arav', bg: 'bg-arav/10' },
    DELIVERED: { color: 'text-arav', bg: 'bg-arav/10' },
    COMPLETED: { color: 'text-arav', bg: 'bg-arav/10' },
    PAID: { color: 'text-arav', bg: 'bg-arav/10' },
    PUBLISHED: { color: 'text-arav', bg: 'bg-arav/10' },
    LIVE: { color: 'text-arav', bg: 'bg-arav/10' },

    NEW: { color: 'text-neel', bg: 'bg-neel/10' },
    PROCESSING: { color: 'text-neel', bg: 'bg-neel/10' },
    REQUESTED: { color: 'text-neel', bg: 'bg-neel/10' },
    IN_REPAIR: { color: 'text-neel', bg: 'bg-neel/10' },
    DRAFT: { color: 'text-neel', bg: 'bg-neel/10' },
    SCHEDULED: { color: 'text-neel', bg: 'bg-neel/10' },
    TRAINING: { color: 'text-neel', bg: 'bg-neel/10' },
    IDLE: { color: 'text-neel', bg: 'bg-neel/10' },

    SHIPPED: { color: 'text-gulabi', bg: 'bg-gulabi/10' },
    WARN: { color: 'text-gulabi', bg: 'bg-gulabi/10' },
    RESTOCKING: { color: 'text-gulabi', bg: 'bg-gulabi/10' },
    PENDING: { color: 'text-gulabi', bg: 'bg-gulabi/10' },
    ALERT: { color: 'text-gulabi', bg: 'bg-gulabi/10' },

    RETURNED: { color: 'text-agni', bg: 'bg-agni/10' },
    CANCELLED: { color: 'text-agni', bg: 'bg-agni/10' },
    DECLINED: { color: 'text-agni', bg: 'bg-agni/10' },
    REFUNDED: { color: 'text-agni', bg: 'bg-agni/10' },
    FAIL: { color: 'text-agni', bg: 'bg-agni/10' },
    BLACKLIST: { color: 'text-agni', bg: 'bg-agni/10' },
    PAUSED: { color: 'text-agni', bg: 'bg-agni/10' },
    ARCHIVED: { color: 'text-muted-foreground', bg: 'bg-muted' },
  }
  const s = map[status] || { color: 'text-muted-foreground', bg: 'bg-muted' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm ${s.bg} ${s.color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
