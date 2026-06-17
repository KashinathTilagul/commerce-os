'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, GitBranch, MessageSquare, Clock, ArrowRight, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { timeAgo } from '@/lib/ekvaar'

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  BACKLOG: { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Backlog' },
  IN_PROGRESS: { color: 'text-neel', bg: 'bg-neel/10', label: 'In Progress' },
  IN_REVIEW: { color: 'text-gulabi', bg: 'bg-gulabi/10', label: 'In Review' },
  DONE: { color: 'text-arav', bg: 'bg-arav/10', label: 'Done' },
  BLOCKED: { color: 'text-agni', bg: 'bg-agni/10', label: 'Blocked' },
}

const PRIORITY_META: Record<string, string> = {
  P0: 'bg-agni/10 text-agni',
  P1: 'bg-gulabi/10 text-gulabi',
  P2: 'bg-neel/10 text-neel',
  P3: 'bg-muted text-muted-foreground',
}

const TYPE_META: Record<string, string> = {
  TASK: 'Task',
  BUG: 'Bug',
  FEATURE: 'Feature',
  CAMPAIGN: 'Campaign',
  APPROVAL: 'Approval',
  RESEARCH: 'Research',
}

export function IssuesModule() {
  const [view, setView] = useState<'BOARD' | 'LIST'>('BOARD')
  const [selected, setSelected] = useState<any | null>(null)

  const { data: issues = [] } = useQuery<any[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      const r = await fetch('/api/issues')
      return r.json()
    },
  })

  const byStatus: Record<string, any[]> = {
    BACKLOG: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    BLOCKED: [],
    DONE: [],
  }
  for (const i of issues) {
    if (byStatus[i.status]) byStatus[i.status].push(i)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Issues · The Work Object"
        title="PAP Tracker"
        description="Everything in EKVAAR OS is tracked as an Issue. Issues have statuses, assignees, priorities, dependencies (Issue A blocks Issue B), and rich comment threads where agents and humans discuss the task. Each agent heartbeat appends output as a comment."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Issue
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Issues" value={String(issues.length)} accent="#1F3A5F" icon={<GitBranch className="h-4 w-4" />} />
          <KpiCard label="In Progress" value={String(byStatus.IN_PROGRESS.length)} accent="#1F3A5F" />
          <KpiCard label="In Review" value={String(byStatus.IN_REVIEW.length)} accent="#D4859B" />
          <KpiCard label="Blocked" value={String(byStatus.BLOCKED.length)} accent="#C8302A" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <Tabs value={view} onValueChange={(v) => setView(v as 'BOARD' | 'LIST')}>
            <TabsList className="grid grid-cols-2 w-48">
              <TabsTrigger value="BOARD">Board</TabsTrigger>
              <TabsTrigger value="LIST">List</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-[10px] text-muted-foreground">
            Dependencies shown with <ArrowRight className="inline h-3 w-3" /> icon
          </div>
        </div>

        {view === 'BOARD' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(byStatus).map(([status, items]) => {
              const meta = STATUS_META[status]
              return (
                <div key={status} className="flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${meta.bg.replace('/10', '')}`} />
                      <span className="text-xs font-medium">{meta.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <AnimatePresence>
                      {items.map((issue) => (
                        <motion.div
                          key={issue.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                        >
                          <Card
                            className="cursor-pointer hover:border-foreground/40 transition-colors"
                            onClick={() => setSelected(issue)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className={`inline-flex items-center px-1.5 py-0 text-[9px] tracking-wider uppercase rounded-sm ${PRIORITY_META[issue.priority]}`}>
                                  {issue.priority}
                                </span>
                                <span className="text-[9px] text-muted-foreground">{TYPE_META[issue.type] || issue.type}</span>
                              </div>
                              <div className="text-xs font-mono text-muted-foreground mb-1">{issue.code}</div>
                              <div className="text-sm font-medium leading-snug mb-2">{issue.title}</div>

                              {/* Dependencies */}
                              {(issue.blocksIds || issue.blockedByIds) && (
                                <div className="flex items-center gap-1.5 mb-2 text-[10px]">
                                  {issue.blockedByIds && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-agni/10 text-agni">
                                      <AlertTriangle className="h-2.5 w-2.5" /> {issue.blockedByIds}
                                    </span>
                                  )}
                                  {issue.blocksIds && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-gulabi/10 text-gulabi">
                                      <ArrowRight className="h-2.5 w-2.5" /> {issue.blocksIds}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                                {issue.assignee ? (
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
                                      style={{ background: issue.assignee.avatarColor }}
                                    >
                                      {issue.assignee.name?.[0]}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{issue.assignee.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Unassigned</span>
                                )}
                                {issue.comments.length > 0 && (
                                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    {issue.comments.length}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {items.length === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[700px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Code</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Title</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Type</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Priority</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Assignee</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelected(issue)}
                      >
                        <td className="p-3 font-mono text-xs">{issue.code}</td>
                        <td className="p-3 font-medium">{issue.title}</td>
                        <td className="p-3 text-xs">{TYPE_META[issue.type] || issue.type}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-1.5 py-0 text-[9px] tracking-wider uppercase rounded-sm ${PRIORITY_META[issue.priority]}`}>{issue.priority}</span></td>
                        <td className="p-3">
                          {issue.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white" style={{ background: issue.assignee.avatarColor }}>
                                {issue.assignee.name?.[0]}
                              </div>
                              <span className="text-xs">{issue.assignee.name}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="p-3"><StatusPill status={issue.status} /></td>
                        <td className="p-3 text-[10px] text-muted-foreground">{timeAgo(issue.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issue detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] tracking-wider uppercase rounded-sm ${PRIORITY_META[selected.priority]}`}>{selected.priority}</span>
                  <span className="text-[10px] text-muted-foreground">{TYPE_META[selected.type] || selected.type}</span>
                  <StatusPill status={selected.status} />
                </div>
                <DialogTitle className="font-display text-2xl tracking-tight">{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.department} · Created {timeAgo(selected.createdAt)} by {selected.createdBy?.name || 'System'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Description</div>
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>

                {(selected.blocksIds || selected.blockedByIds) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selected.blockedByIds && (
                      <div className="p-3 border border-agni/30 bg-agni/5 rounded-md">
                        <div className="text-[10px] tracking-wider uppercase text-agni mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Blocked By
                        </div>
                        <div className="font-mono text-sm">{selected.blockedByIds}</div>
                      </div>
                    )}
                    {selected.blocksIds && (
                      <div className="p-3 border border-gulabi/30 bg-gulabi/5 rounded-md">
                        <div className="text-[10px] tracking-wider uppercase text-gulabi mb-1 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> Blocks
                        </div>
                        <div className="font-mono text-sm">{selected.blocksIds}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Assignee</div>
                    {selected.assignee ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white" style={{ background: selected.assignee.avatarColor }}>
                          {selected.assignee.name?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{selected.assignee.name}</div>
                          <div className="text-[10px] text-muted-foreground">{selected.assignee.role}</div>
                        </div>
                      </div>
                    ) : <div className="text-sm text-muted-foreground mt-1">Unassigned</div>}
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Created By</div>
                    {selected.createdBy ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white" style={{ background: selected.createdBy.avatarColor }}>
                          {selected.createdBy.name?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{selected.createdBy.name}</div>
                          <div className="text-[10px] text-muted-foreground">{selected.createdBy.role}</div>
                        </div>
                      </div>
                    ) : <div className="text-sm text-muted-foreground mt-1">System</div>}
                  </div>
                </div>

                {/* Comment thread */}
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Comment Thread ({selected.comments.length})
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {selected.comments.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                          style={{ background: c.author?.avatarColor || '#888' }}
                        >
                          {c.authorName?.[0] || 'S'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium">{c.authorName}</span>
                            {c.kind !== 'COMMENT' && (
                              <span className="text-[9px] tracking-wider uppercase px-1 py-0 rounded bg-muted text-muted-foreground">
                                {c.kind.replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                          </div>
                          <div className="text-sm leading-relaxed bg-muted/40 p-2.5 rounded-md">
                            {c.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 text-xs border border-border rounded-md bg-background"
                      placeholder="Add a comment…"
                    />
                    <Button size="sm" className="h-8">Post</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
