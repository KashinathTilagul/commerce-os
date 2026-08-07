'use client'

import { useQuery } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { FolderKanban, Loader2 } from 'lucide-react'

export function ProjectsPage() {
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['workforce-issues'],
    queryFn: async () => {
      const res = await fetch('/api/issues')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Group issues by department / project cluster
  const departments: Record<string, any[]> = {}
  for (const issue of issues) {
    const dept = issue.department || 'GENERAL'
    if (!departments[dept]) departments[dept] = []
    departments[dept].push(issue)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h1 className="font-display text-xl tracking-tight">Projects & Clusters</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Departmental project groupings and multi-issue milestones
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(departments).length === 0 ? (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center">
            <FolderKanban className="h-6 w-6 text-muted-foreground/40" />
            <h3 className="mt-3 font-display text-sm tracking-tight text-muted-foreground">No Projects Active</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground/60">
              Create issues in the Issues tab to see them automatically grouped into departmental projects here.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {Object.entries(departments).map(([dept, deptIssues]) => {
              const doneCount = deptIssues.filter((i) => i.status === 'DONE').length
              const pct = Math.round((doneCount / deptIssues.length) * 100)

              return (
                <GlassPanel key={dept} level={2} className="rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-medium tracking-tight uppercase">{dept} PROJECT</h3>
                    <span className="text-[11px] font-mono text-muted-foreground">{doneCount}/{deptIssues.length} Done</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full bg-emerald-400/80 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {deptIssues.slice(0, 4).map((i) => (
                      <div key={i.id} className="flex items-center justify-between py-2 text-[11px]">
                        <span className="truncate pr-2">{i.title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{i.status}</span>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
