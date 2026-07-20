'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, GitBranch, MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useAppSubscription } from '@/lib/cpu-websocket'

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

function IssueSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-4 w-8 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-3 w-20 bg-muted rounded animate-pulse mb-1" />
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-4 w-8 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export function IssuesModule() {
  const [view, setView] = useState<'BOARD' | 'LIST'>('BOARD')
  const [selected, setSelected] = useState<any | null>(null)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newIssue, setNewIssue] = useState({ title: '', description: '', priority: 'P2', type: 'TASK' })
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const { data: issues = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      const r = await fetch('/api/issues')
      if (!r.ok) throw new Error('Failed to fetch issues')
      return r.json()
    },
    staleTime: 30000,
  })

  useAppSubscription('issues')

  const handleStatusChange = async (issue: any, newStatus: string) => {
    const oldStatus = issue.status

    queryClient.setQueryData<any[]>(['issues'], (old = []) =>
      old.map(i => i.id === issue.id ? { ...i, status: newStatus } : i)
    )

    if (selected?.id === issue.id) {
      setSelected({ ...issue, status: newStatus })
    }

    try {
      const r = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!r.ok) {
        queryClient.setQueryData<any[]>(['issues'], (old = []) =>
          old.map(i => i.id === issue.id ? { ...i, status: oldStatus } : i)
        )
        if (selected?.id === issue.id) {
          setSelected({ ...issue, status: oldStatus })
        }
        throw new Error('Failed')
      }
      toast.success('Status updated', `${issue.code} → ${newStatus.replace(/_/g, ' ')}`)
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch {
      toast.error('Update failed', 'Could not change issue status')
    }
  }

  const handleAddComment = async () => {
    if (!selected || !commentText.trim()) return
    setPosting(true)
    try {
      const r = await fetch(`/api/issues/${selected.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText, authorName: 'Founder' }),
      })
      if (!r.ok) throw new Error('Failed')
      toast.success('Comment posted', `On ${selected.code}`)
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      // Refresh selected with new comments
      const refreshed = await fetch('/api/issues').then((r) => r.json())
      const updated = refreshed.find((i: any) => i.id === selected.id)
      if (updated) setSelected(updated)
    } catch {
      toast.error('Post failed', 'Could not add comment')
    } finally {
      setPosting(false)
    }
  }

  const handleCreateIssue = async () => {
    if (!newIssue.title.trim()) return
    setCreating(true)
    try {
      const r = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIssue),
      })
      if (!r.ok) throw new Error('Failed')
      const created = await r.json()
      toast.success('Issue created', `${created.code} added to backlog`)
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCreateOpen(false)
      setNewIssue({ title: '', description: '', priority: 'P2', type: 'TASK' })
    } catch {
      toast.error('Create failed', 'Could not create issue')
    } finally {
      setCreating(false)
    }
  }

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
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Issue
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {error && (
          <Card className="border-agni/40 bg-agni/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-agni" />
              <div>
                <div className="font-medium text-sm">Unable to load issues</div>
                <div className="text-xs text-muted-foreground">Check your connection and try again.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Issues" value={isLoading ? '—' : String(issues.length)} accent="#1F3A5F" icon={<GitBranch className="h-4 w-4" />} />
          <KpiCard label="In Progress" value={isLoading ? '—' : String(byStatus.IN_PROGRESS.length)} accent="#1F3A5F" />
          <KpiCard label="In Review" value={isLoading ? '—' : String(byStatus.IN_REVIEW.length)} accent="#D4859B" />
          <KpiCard label="Blocked" value={isLoading ? '—' : String(byStatus.BLOCKED.length)} accent="#C8302A" icon={<AlertTriangle className="h-4 w-4" />} />
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
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'].map(status => (
                <div key={status} className="space-y-2">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse mb-3" />
                  {[1, 2].map(i => <IssueSkeleton key={i} />)}
                </div>
              ))}
            </div>
          ) : (
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
                                {(issue.comments?.length ?? 0) > 0 && (
                                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    {issue.comments?.length ?? 0}
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
          )
        ) : (
          isLoading ? (
            <Card>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3 border-b border-border/60">
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-40 bg-muted rounded animate-pulse flex-1" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-10 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
          )
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
                  <Select
                    value={selected.status}
                    onValueChange={(v) => handleStatusChange(selected, v)}
                  >
                    <SelectTrigger className="h-6 w-36 text-[10px] px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <MessageSquare className="h-3 w-3" /> Comment Thread ({selected.comments?.length ?? 0})
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
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !posting) handleAddComment() }}
                    />
                    <Button size="sm" className="h-8" disabled={posting || !commentText.trim()} onClick={handleAddComment}>
                      {posting ? 'Posting…' : 'Post'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Issue Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight text-xl">New Issue</DialogTitle>
            <DialogDescription>Create a new task or work object for the C-suite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1 block">Title</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="What needs to be done?"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1 block">Description</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Details, context, or requirements..."
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1 block">Type</label>
                <Select value={newIssue.type} onValueChange={(v) => setNewIssue({ ...newIssue, type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TASK">Task</SelectItem>
                    <SelectItem value="BUG">Bug</SelectItem>
                    <SelectItem value="FEATURE">Feature</SelectItem>
                    <SelectItem value="CAMPAIGN">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1 block">Priority</label>
                <Select value={newIssue.priority} onValueChange={(v) => setNewIssue({ ...newIssue, priority: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 (Critical)</SelectItem>
                    <SelectItem value="P1">P1 (High)</SelectItem>
                    <SelectItem value="P2">P2 (Medium)</SelectItem>
                    <SelectItem value="P3">P3 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button size="sm" onClick={handleCreateIssue} disabled={!newIssue.title.trim() || creating}>
              {creating ? 'Creating…' : 'Create Issue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
