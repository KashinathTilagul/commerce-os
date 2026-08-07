'use client'

import { useState, type ReactNode } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import {
  LayoutDashboard, Users, Network, Target, FolderKanban, ListChecks,
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
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
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

export function WorkforceShell({ children }: WorkforceShellProps) {
  const [section, setSection] = useState<Section>('agents')

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <GlassPanel level={1} className="flex w-52 shrink-0 flex-col overflow-y-auto rounded-none border-r border-white/[0.06] py-4">
        <div className="px-4 pb-4">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            AI Workforce
          </h2>
        </div>

        {NAV.map((group) => (
          <div key={group.label || 'top'} className="mb-1">
            {group.label && (
              <div className="px-4 pb-1 pt-3 text-[9px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = section === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-2.5 px-4 py-1.5 text-left text-[12px] transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-foreground'
                      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </GlassPanel>

      {/* Workspace pane */}
      <div className="flex-1 overflow-y-auto">
        {children(section, setSection)}
      </div>
    </div>
  )
}

export type { Section }
