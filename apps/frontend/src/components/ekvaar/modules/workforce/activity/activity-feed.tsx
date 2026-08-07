'use client'

import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Activity, AlertTriangle, ShieldCheck, Info, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/ekvaar'

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  INFO: <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />,
  WARN: <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />,
  ERROR: <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />,
  CRITICAL: <ShieldCheck className="h-3.5 w-3.5 text-red-500 shrink-0" />,
}

export function ActivityFeed() {
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['workforce-activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity')
      if (!res.ok) return []
      const data = await res.json()
      return data.events || []
    },
    refetchInterval: 5000,
  })

  const events = eventsData || []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Audit Trail & Activity</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Append-only event stream recording agent heartbeats, delegations, and governance approvals
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center">
            <Activity className="h-6 w-6 text-muted-foreground/40" />
            <h3 className="mt-3 font-display text-sm tracking-tight text-muted-foreground">No Event Activity Recorded</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground/60">
              When agents execute tasks, delegate work, or request approvals, auditable events will stream live here.
            </p>
          </GlassPanel>
        ) : (
          <GlassPanel level={2} className="rounded-xl p-5 space-y-3">
            <div className="divide-y divide-white/[0.06]">
              {events.map((evt: any) => (
                <div key={evt.id} className="flex items-start gap-3 py-3 text-[11px]">
                  {SEVERITY_ICON[evt.severity] || SEVERITY_ICON.INFO}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{evt.summary}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(evt.timestamp)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Actor: <span className="text-foreground/80">{evt.actorName || 'System'}</span> · Type: <span className="font-mono">{evt.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
