'use client'

import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import {
  LayoutDashboard, Users, Network, ListChecks,
  ShieldCheck, Activity, DollarSign, Settings as SettingsIcon,
} from 'lucide-react'

type Section =
  | 'overview'
  | 'agents'
  | 'org-chart'
  | 'goals'
  | 'projects'
  | 'issues'
  | 'approvals'
  | 'activity'
  | 'costs'
  | 'settings'

interface NavGroup {
  label: string
  items: { id: Section; label: string; icon: typeof LayoutDashboard }[]
}

const NAV: NavGroup[] = [
  { label: '', items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Workforce',
    items: [
      { id: 'agents', label: 'Agents', icon: Users },
      { id: 'org-chart', label: 'Org Chart', icon: Network },
    ],
  },
  {
    label: 'Work',
    items: [
      // Goals & Projects removed — the Overview wizard rail is the single entry point for work.
      { id: 'issues', label: 'Issues', icon: ListChecks },
    ],
  },
  {
    label: 'Control',
    items: [
      { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
      { id: 'activity', label: 'Activity', icon: Activity },
      { id: 'costs', label: 'Costs', icon: DollarSign },
    ],
  },
  {
    label: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: SettingsIcon }],
  },
]

interface WorkforceShellProps {
  children: (section: Section, setSection: (s: Section) => void) => ReactNode
}

// Live counts shown as nav badges so the founder can see where work is
// waiting without clicking through every section.
export function useNavBadges() {
  const approvals = useQuery({
    queryKey: ['nav-approvals-pending'],
    queryFn: async () => {
      const res = await fetch('/api/approvals?status=PENDING')
      if (!res.ok) return []
      const data = await res.json()
      return (data?.approvals || data || []) as any[]
    },
    refetchInterval: 30000,
  })
  const issues = useQuery({
    queryKey: ['nav-issues-open'],
    queryFn: async () => {
      const res = await fetch('/api/issues')
      if (!res.ok) return []
      const data = await res.json()
      return (Array.isArray(data) ? data : data?.issues || []) as any[]
    },
    refetchInterval: 30000,
  })
  const openIssues = (issues.data || []).filter(
    (i: any) => !['DONE', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(String(i.status || '').toUpperCase())
  ).length
  return {
    approvals: (approvals.data || []).length,
    issues: openIssues,
  }
}

export function WorkforceShell({ children }: WorkforceShellProps) {
  const [section, setSection] = useState<Section>('overview')
  const badges = useNavBadges()
  const badgeFor = (id: Section) =>
    id === 'approvals' ? badges.approvals : id === 'issues' ? badges.issues : 0

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <GlassPanel level={1} className="flex w-56 shrink-0 flex-col overflow-y-auto rounded-none border-r border-white/[0.06] py-4">
        <div className="px-4 pb-3">
          <h2 className="font-display text-[12px] tracking-[0.18em] uppercase text-foreground/90">
            AI Workforce
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">Your digital C-suite</p>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((group) => (
            <div key={group.label || 'top'} className="mb-1">
              {group.label && (
                <div className="px-2 pb-1 pt-3 text-[9px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/50">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active = section === item.id
                const Icon = item.icon
                const badge = badgeFor(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                      active
                        ? 'bg-cyan-300/[0.12] text-foreground'
                        : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-cyan-300" />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-300' : 'text-muted-foreground/80 group-hover:text-foreground/80'}`} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                        item.id === 'approvals'
                          ? 'bg-amber-300/20 text-amber-200'
                          : 'bg-white/[0.08] text-muted-foreground'
                      }`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </GlassPanel>

      {/* Workspace pane */}
      <div className="flex-1 overflow-y-auto">
        {children(section, setSection)}
      </div>
    </div>
  )
}

export type { Section }
