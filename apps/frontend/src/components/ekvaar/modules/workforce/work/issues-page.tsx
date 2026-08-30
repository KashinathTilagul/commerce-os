'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { Plus, Play, Loader2, MessageSquare, X } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'
import { invalidateWorkforceState } from '@/lib/query-invalidation'

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'DONE', label: 'Done' },
]

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'bg-red-500/20 text-red-400 border-red-500/30',
  P1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  P2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  P3: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function IssuesPage() {
  const queryClient = useQueryClient()
  const [selectedIssue, setSelectedIssue] = useState<any>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('P2')
  const [isCreating, setIsCreating] = useState(false)
  const [runningIssueId, setRunningIssueId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['workforce-issues'],
    queryFn: async () => {
      const res = await fetch('/api/issues')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['workforce-agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents')
      if (!res.ok) return []
      const data = await res.json()
      return data.agents || data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; priority: string }) => {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create issue')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Issue created')
      setNewTitle('')
      setNewDesc('')
      setIsCreating(false)
      invalidateWorkforceState(queryClient)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error creating issue')
    },
  })

  const handleRunTask = async (issue: any) => {
    if (!issue.assigneeId) {
      toast.error('Please assign an agent to this issue before running')
      return
    }
    setRunningIssueId(issue.id)
    try {
      const res = await fetch(`/api/agents/${issue.assigneeId}/heartbeat`, { method: 'POST' })
      if (res.ok || res.status === 202) {
        toast.success(`Heartbeat triggered for ${issue.assignee?.name || 'Agent'}`)
        invalidateWorkforceState(queryClient, issue.assigneeId)
      } else {
        toast.error('Failed to trigger heartbeat')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setRunningIssueId(null)
    }
  }

  const handleAssignAgent = async (issueId: string, assigneeId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      })
      if (res.ok) {
        toast.success('Assignee updated')
        invalidateWorkforceState(queryClient, assigneeId)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Failed to update assignee')
      }
    } catch {
      toast.error('Failed to update assignee')
    }
  }

  const handleStatus = async (issueId: string, status: string) => {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return toast.error('Failed to update status')
    toast.success('Issue status updated')
    invalidateWorkforceState(queryClient)
  }

  const handleComment = async (issueId: string) => {
    const body = commentText.trim()
    if (!body) return
    const res = await fetch(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, authorName: 'Founder' }),
    })
    if (!res.ok) return toast.error('Failed to add comment')
    setCommentText('')
    toast.success('Comment added')
    invalidateWorkforceState(queryClient)
  }

  const activeIssue = selectedIssue ? issues.find((issue: any) => issue.id === selectedIssue.id) ?? selectedIssue : null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <div>
          <h1 className="font-display text-xl tracking-tight">Issues & Work</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Goal → Project → Issue → Agent → Run trace pipeline
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="glass-l2 flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-white/[0.12]"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Issue
        </button>
      </div>

      {/* New Issue Form */}
      {isCreating && (
        <div className="border-b border-white/[0.06] bg-black/40 p-6 space-y-4">
          <h3 className="font-display text-sm">New Work Item</h3>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Issue title (e.g. Build August Growth Campaign)"
            className="w-full h-8 rounded-md bg-white/[0.04] px-3 text-[12px] text-foreground outline-none focus:bg-white/[0.08]"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Detailed description and deliverable requirements..."
            className="w-full h-20 rounded-md bg-white/[0.04] p-3 text-[12px] text-foreground outline-none focus:bg-white/[0.08]"
          />
          <div className="flex items-center justify-between">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="h-8 rounded-md bg-white/[0.06] px-3 text-[11px] text-foreground outline-none"
            >
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => newTitle.trim() && createMutation.mutate({ title: newTitle, description: newDesc, priority: newPriority })}
                disabled={createMutation.isPending || !newTitle.trim()}
                className="glass-l2 rounded-md px-4 py-1 text-[11px] font-medium text-foreground hover:bg-white/[0.12] disabled:opacity-40"
              >
                Save Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-4 min-w-[900px] h-full">
            {COLUMNS.map((col) => {
              const colIssues = issues.filter((i: any) => i.status === col.id)
              return (
                <div key={col.id} className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                      {col.label}
                    </span>
                    <span className="rounded bg-white/[0.06] px-1.5 text-[10px] text-muted-foreground">
                      {colIssues.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {colIssues.map((issue: any) => (
                      <GlassPanel
                        key={issue.id}
                        level={2}
                        className="group cursor-pointer rounded-xl p-4 transition-all hover:border-white/[0.2]"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{issue.code}</span>
                          <span className={`rounded border px-1.5 py-0.2 text-[9px] font-medium ${PRIORITY_COLOR[issue.priority] || PRIORITY_COLOR.P2}`}>
                            {issue.priority}
                          </span>
                        </div>

                        <h4 className="text-[12px] font-medium leading-snug line-clamp-2">{issue.title}</h4>
                        {issue.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground/70 line-clamp-2">{issue.description}</p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px]">
                          <select
                            value={issue.assigneeId || ''}
                            onChange={(e) => { e.stopPropagation(); handleAssignAgent(issue.id, e.target.value) }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent text-muted-foreground hover:text-foreground outline-none text-[10px] cursor-pointer max-w-[120px] truncate"
                          >
                            <option value="" className="bg-black text-white">Unassigned</option>
                            {agents.filter((a: any) => !a.isHuman).map((a: any) => (
                              <option key={a.id} value={a.id} className="bg-black text-white">
                                {a.name} ({a.code})
                              </option>
                            ))}
                          </select>

                          {issue.assigneeId && ['BACKLOG', 'IN_PROGRESS'].includes(issue.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRunTask(issue) }}
                              disabled={runningIssueId === issue.id}
                              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:underline disabled:opacity-40"
                            >
                              {runningIssueId === issue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              Run
                            </button>
                          )}
                        </div>
                      </GlassPanel>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeIssue && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}>
          <GlassPanel level={4} className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-white/15 p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <div className="font-mono text-[10px] text-cyan-300">{activeIssue.code}</div>
                <h2 className="mt-1 font-display text-lg">{activeIssue.title}</h2>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{activeIssue.description}</p>
              </div>
              <button aria-label="Close issue" onClick={() => setSelectedIssue(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 border-b border-white/[0.08] py-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Status
                <select value={activeIssue.status} onChange={(event) => handleStatus(activeIssue.id, event.target.value)} className="block h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[11px] normal-case tracking-normal text-foreground">
                  {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                  <option value="BLOCKED">Blocked</option>
                </select>
              </label>
              <label className="space-y-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Assignee
                <select value={activeIssue.assigneeId || ''} onChange={(event) => handleAssignAgent(activeIssue.id, event.target.value)} className="block h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[11px] normal-case tracking-normal text-foreground">
                  <option value="">Unassigned</option>
                  {agents.filter((agent: any) => !agent.isHuman).map((agent: any) => <option key={agent.id} value={agent.id}>{agent.name} ({agent.code})</option>)}
                </select>
              </label>
            </div>

            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> Work log</div>
                {activeIssue.assigneeId && ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'].includes(activeIssue.status) && (
                  <button onClick={() => handleRunTask(activeIssue)} disabled={runningIssueId === activeIssue.id} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 px-3 py-1.5 text-[10px] text-emerald-300 disabled:opacity-40">
                    {runningIssueId === activeIssue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Run employee
                  </button>
                )}
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {activeIssue.comments?.length ? activeIssue.comments.map((comment: any) => (
                  <div key={comment.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-5">
                    <div className="mb-1 text-[9px] text-muted-foreground">{comment.authorName} · {comment.kind}</div>
                    <div className="whitespace-pre-wrap">{comment.body}</div>
                  </div>
                )) : <div className="rounded-lg border border-dashed border-white/[0.08] p-5 text-center text-[10px] text-muted-foreground">No work log entries yet.</div>}
              </div>
              <div className="flex gap-2">
                <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add founder direction or feedback..." className="min-h-16 flex-1 resize-none rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-[11px] outline-none focus:border-cyan-300/25" />
                <button onClick={() => handleComment(activeIssue.id)} disabled={!commentText.trim()} className="self-end rounded-lg bg-cyan-300 px-4 py-2 text-[10px] font-semibold text-slate-950 disabled:opacity-40">Add comment</button>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
