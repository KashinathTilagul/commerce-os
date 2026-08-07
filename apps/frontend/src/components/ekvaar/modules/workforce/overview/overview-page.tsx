'use client'

import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Users, Activity, ShieldCheck, DollarSign, Loader2 } from 'lucide-react'

export function OverviewPage({ onNavigate }: { onNavigate: (section: any) => void }) {
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return data.agents || data || []
    },
  })

  const { data: approvals = [] } = useQuery({
    queryKey: ['workforce-approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals')
      if (!res.ok) return []
      const data = await res.json()
      return data.approvals || data || []
    },
  })

  const activeAgents = agents.filter((a: any) => !a.isHuman && ['IDLE', 'RUNNING'].includes(a.status))
  const runningAgents = agents.filter((a: any) => !a.isHuman && a.status === 'RUNNING')
  const pendingApprovals = approvals.filter((app: any) => app.status === 'PENDING')

  const totalSpend = agents.reduce((acc: number, a: any) => acc + (a.tokenSpend || 0), 0)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Overview</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Real-time executive snapshot of your AI Workforce
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <KpiPlate
            title="Total Agents"
            value={loadingAgents ? '...' : String(agents.filter((a: any) => !a.isHuman).length)}
            sub={`${runningAgents.length} currently running`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            onClick={() => onNavigate('agents')}
          />
          <KpiPlate
            title="Active Workforce"
            value={loadingAgents ? '...' : String(activeAgents.length)}
            sub="Ready for assignments"
            icon={<Activity className="h-4 w-4 text-emerald-400" />}
            onClick={() => onNavigate('agents')}
          />
          <KpiPlate
            title="Pending Approvals"
            value={String(pendingApprovals.length)}
            sub="Governance gates awaiting sign-off"
            icon={<ShieldCheck className="h-4 w-4 text-amber-400" />}
            onClick={() => onNavigate('approvals')}
          />
          <KpiPlate
            title="Workforce Spend"
            value={`₹${totalSpend.toFixed(0)}`}
            sub="Accumulated AI token cost"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            onClick={() => onNavigate('costs')}
          />
        </div>

        {/* Live Running Agents */}
        <GlassPanel level={2} className="rounded-xl p-5">
          <h2 className="font-display text-sm tracking-tight mb-4">Active Agents</h2>
          {loadingAgents ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : activeAgents.length === 0 ? (
            <div className="text-[12px] text-muted-foreground/60 py-4 text-center">
              No active agents found in database.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {activeAgents.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ background: a.avatarColor || '#6b7280' }}
                    >
                      {a.name[0]}
                    </span>
                    <div>
                      <div className="text-[12px] font-medium leading-tight">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">{a.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-foreground/80">
                      {a.currentTask || 'Idle — waiting for wake trigger'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">₹{Number(a.tokenSpend || 0).toFixed(0)} spent</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}

function KpiPlate({
  title,
  value,
  sub,
  icon,
  onClick,
}: {
  title: string
  value: string
  sub: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <GlassPanel
      level={2}
      className="cursor-pointer rounded-xl p-5 transition-all hover:border-white/[0.2] hover:translate-y-[-1px]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-2 font-display text-2xl tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground/70">{sub}</div>
    </GlassPanel>
  )
}
