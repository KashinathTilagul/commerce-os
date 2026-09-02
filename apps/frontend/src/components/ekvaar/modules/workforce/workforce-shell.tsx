'use client'

import { type ReactNode, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import {
  LayoutDashboard, Users, Network, ListChecks,
  ShieldCheck, Activity, DollarSign, Settings as SettingsIcon,
  ChevronDown, ChevronRight, Folder, FolderOpen, Bot,
} from 'lucide-react'
import { useWindowStore } from '@/lib/window-store'

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

const DEPARTMENT_LABELS: Record<string, string> = {
  EXECUTIVE: 'Leadership',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  RESEARCH: 'Product',
  TECHNOLOGY: 'Technology',
  FINANCE: 'Finance',
  CREATIVE: 'Creative',
  CUSTOMER: 'Customer',
  GROWTH: 'Growth',
  HR: 'People',
  LEGAL: 'Legal',
}

const DEPARTMENT_ORDER = [
  'EXECUTIVE',
  'MARKETING',
  'OPERATIONS',
  'RESEARCH',
  'TECHNOLOGY',
  'FINANCE',
  'CREATIVE',
  'CUSTOMER',
  'GROWTH',
  'HR',
  'LEGAL',
]

interface WorkforceShellProps {
  children: (section: Section, setSection: (s: Section) => void) => ReactNode
}

export function useNavBadges() {
  const approvals = useQuery({
    queryKey: ['nav-approvals-pending'],
    queryFn: async () => {
      const res = await fetch('/api/approvals?status=PENDING')
      if (!res.ok) return []
      const data = await res.json()
      return (data?.approvals || data || []) as any[]
    },
    refetchInterval: 60_000,
  })
  const issues = useQuery({
    queryKey: ['nav-issues-open'],
    queryFn: async () => {
      const res = await fetch('/api/issues')
      if (!res.ok) return []
      const data = await res.json()
      return (Array.isArray(data) ? data : data?.issues || []) as any[]
    },
    refetchInterval: 60_000,
  })
  const openIssues = (issues.data || []).filter(
    (i: any) => !['DONE', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(String(i.status || '').toUpperCase())
  ).length
  return {
    approvals: (approvals.data || []).filter((approval: any) => approval.status === 'PENDING').length,
    issues: openIssues,
  }
}

export function WorkforceShell({ children }: WorkforceShellProps) {
  const storedSection = useWindowStore((state) => state.appState.agents?.section)
  const storedAgentId = useWindowStore((state) => state.appState.agents?.selectedAgentId)
  const setAppState = useWindowStore((state) => state.setAppState)
  
  const section = NAV.flatMap((group) => group.items).some((item) => item.id === storedSection)
    ? storedSection as Section
    : 'overview'
  const setSection = (next: Section) => setAppState('agents', { section: next })
  const setSelectedAgent = (agentId: string | null) => {
    setAppState('agents', { section: 'agents', selectedAgentId: agentId })
  }

  const badges = useNavBadges()
  const badgeFor = (id: Section) =>
    id === 'approvals' ? badges.approvals : id === 'issues' ? badges.issues : 0

  // Track expanded groups in sidebar
  const [sidebarAgentsExpanded, setSidebarAgentsExpanded] = useState(true)
  const [expandedDeptGroups, setExpandedDeptGroups] = useState<Record<string, boolean>>({
    EXECUTIVE: false,
    MARKETING: false,
    OPERATIONS: false,
    RESEARCH: false,
  })

  // Fetch agents for nested sidebar tree
  const { data: agents = [] } = useQuery({
    queryKey: ['workforce-agents-sidebar'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return (data.agents || data || []) as any[]
    },
    refetchInterval: 60_000,
  })

  const groupedAgents = useMemo(() => {
    const map: Record<string, any[]> = {}
    agents.forEach((agent: any) => {
      if (agent.isHuman) return
      const dept = (agent.department || 'EXECUTIVE').toUpperCase()
      if (!map[dept]) map[dept] = []
      map[dept].push(agent)
    })
    return map
  }, [agents])

  const toggleDeptGroup = (dept: string) => {
    setExpandedDeptGroups((prev) => ({
      ...prev,
      [dept]: !prev[dept],
    }))
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <GlassPanel level={1} className="flex w-60 shrink-0 flex-col overflow-y-auto rounded-none border-r border-white/[0.06] py-4">
        <div className="px-4 pb-3">
          <h2 className="font-display text-[12px] tracking-[0.18em] uppercase text-foreground/90">
            AI Workforce
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">Group-based control plane</p>
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
                const active = section === item.id && (item.id !== 'agents' || !storedAgentId)
                const Icon = item.icon
                const badge = badgeFor(item.id)

                if (item.id === 'agents') {
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          setSection('agents')
                          setSelectedAgent(null)
                          setSidebarAgentsExpanded(!sidebarAgentsExpanded)
                        }}
                        className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                          active
                            ? 'bg-cyan-300/[0.12] text-foreground'
                            : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-cyan-300" />
                        )}
                        <span onClick={(e) => { e.stopPropagation(); setSidebarAgentsExpanded(!sidebarAgentsExpanded) }} className="p-0.5 text-muted-foreground/60 hover:text-foreground">
                          {sidebarAgentsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </span>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-cyan-300' : 'text-muted-foreground/80'}`} />
                        <span className="flex-1">Agents Groups</span>
                        <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {agents.filter((a) => !a.isHuman).length}
                        </span>
                      </button>

                      {/* Nested Groups in Sidebar */}
                      {sidebarAgentsExpanded && (
                        <div className="ml-3 pl-2 border-l border-white/[0.06] space-y-1 py-1">
                          {DEPARTMENT_ORDER.filter((deptKey) => groupedAgents[deptKey]?.length > 0).map((deptKey) => {
                            const deptLabel = DEPARTMENT_LABELS[deptKey] || deptKey
                            const deptBots = groupedAgents[deptKey] || []
                            const isExpanded = expandedDeptGroups[deptKey] !== false

                            return (
                              <div key={deptKey} className="space-y-0.5">
                                {/* Group Header Button */}
                                <button
                                  onClick={() => toggleDeptGroup(deptKey)}
                                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] font-medium text-muted-foreground/80 hover:bg-white/[0.04] hover:text-foreground transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-cyan-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                    )}
                                    {isExpanded ? (
                                      <FolderOpen className="h-3 w-3 text-cyan-300 shrink-0" />
                                    ) : (
                                      <Folder className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                    )}
                                    <span className="truncate">{deptLabel}</span>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground/50 bg-white/[0.04] px-1.5 py-0.2 rounded-full">
                                    {deptBots.length}
                                  </span>
                                </button>

                                {/* Nested Bots List */}
                                {isExpanded && (
                                  <div className="ml-3 pl-2 border-l border-white/[0.04] space-y-0.5 py-0.5">
                                    {deptBots.map((bot) => {
                                      const isBotActive = section === 'agents' && storedAgentId === bot.id
                                      return (
                                        <button
                                          key={bot.id}
                                          onClick={() => setSelectedAgent(bot.id)}
                                          className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[10.5px] transition-colors truncate ${
                                            isBotActive
                                              ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                                              : 'text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground'
                                          }`}
                                        >
                                          <Bot className={`h-3 w-3 shrink-0 ${isBotActive ? 'text-cyan-300' : 'text-muted-foreground/50'}`} />
                                          <span className="truncate">{bot.name}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSection(item.id)
                      if (item.id !== 'agents') setSelectedAgent(null)
                    }}
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
