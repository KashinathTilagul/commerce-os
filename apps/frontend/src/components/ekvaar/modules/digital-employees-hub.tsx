'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, CircleDot, Loader2, Play, Send, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useAppSubscription } from '@/lib/cpu-websocket'

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Queued',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'Needs review',
  MILESTONE_REVIEW: 'Milestone review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

function latestOutput(issue: any) {
  const lastComment = issue.comments?.[issue.comments.length - 1]
  return lastComment?.body || issue.description || 'No update yet.'
}

function WorkCard({ issue, onOpen, onRun, running }: { issue: any; onOpen: () => void; onRun: () => void; running: boolean }) {
  const canRun = Boolean(issue.assignee && !issue.assignee.isHuman && ['BACKLOG', 'IN_PROGRESS'].includes(issue.status))

  return (
    <Card className="group border-border/80 transition-colors hover:border-foreground/40">
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={onOpen}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-muted-foreground">{issue.code}</span>
            <StatusPill status={issue.status} />
          </div>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{issue.title}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{latestOutput(issue)}</p>
        </button>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <button className="flex min-w-0 items-center gap-2 text-left" onClick={onOpen}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] text-white" style={{ background: issue.assignee?.avatarColor || '#6b7280' }}>
              {issue.assignee?.name?.[0] || '?'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">{issue.assignee?.name || 'Unassigned'}</span>
          </button>
          {canRun && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={onRun} disabled={running}>
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function DigitalEmployeesHub() {
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [mission, setMission] = useState('')
  const [delegating, setDelegating] = useState(false)
  const [runningIssueId, setRunningIssueId] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data: agents = [], isLoading: agentsLoading } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      return response.json()
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
  const { data: issues = [], isLoading: issuesLoading, error } = useQuery<any[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      const response = await fetch('/api/issues')
      if (!response.ok) throw new Error('Failed to fetch work')
      return response.json()
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  useAppSubscription('agents')
  useAppSubscription('issues')

  const executableAgents = agents.filter((agent) => !agent.isHuman)
  const active = issues.filter((issue) => ['BACKLOG', 'IN_PROGRESS'].includes(issue.status))
  const decisions = issues.filter((issue) => ['IN_REVIEW', 'MILESTONE_REVIEW', 'BLOCKED'].includes(issue.status))
  const completed = issues.filter((issue) => issue.status === 'DONE')
  const selectedAgent = executableAgents.find((agent) => agent.id === selectedAgentId)

  const refreshWork = () => {
    queryClient.invalidateQueries({ queryKey: ['agents'] })
    queryClient.invalidateQueries({ queryKey: ['issues'] })
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const handleDelegate = async () => {
    if (!selectedAgent || !mission.trim() || delegating) return
    setDelegating(true)
    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: mission.trim() }),
      })
      const result = await response.json()
      if (!response.ok || !result.issueCode) throw new Error(result.error || result.reply || 'Could not delegate work')
      toast.success(`${result.issueCode} assigned to ${selectedAgent.name}`, 'The agent is working now. Its output will appear below.')
      setMission('')
      refreshWork()
    } catch (error: any) {
      toast.error('Delegation failed', error.message || 'Could not reach the agent')
    } finally {
      setDelegating(false)
    }
  }

  const handleRun = async (issue: any) => {
    if (!issue.assignee || runningIssueId) return
    setRunningIssueId(issue.id)
    try {
      const response = await fetch(`/api/agents/${issue.assignee.id}/work`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'Could not run agent')
      toast.success(`${issue.assignee.name} updated ${result.issueCode || issue.code}`, result.newStatus ? `Status: ${STATUS_LABEL[result.newStatus] || result.newStatus}` : result.message)
      refreshWork()
    } catch (error: any) {
      toast.error('Run failed', error.message || 'Could not reach the agent')
    } finally {
      setRunningIssueId(null)
    }
  }

  const handleStatus = async (status: string) => {
    if (!selectedIssue) return
    try {
      const response = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Could not update status')
      setSelectedIssue((issue: any) => ({ ...issue, status }))
      toast.success(`${selectedIssue.code} updated`, `Status: ${STATUS_LABEL[status] || status}`)
      refreshWork()
    } catch {
      toast.error('Update failed', 'Could not change the work status')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Digital Employees"
        title="Workboard"
        description="Give an outcome to the right employee. Track the live work, read the deliverable, and decide what happens next."
        actions={<span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-arav animate-pulse-soft" />{executableAgents.filter((agent) => ['ACTIVE', 'RUNNING'].includes(agent.status)).length} online</span>}
      />

      <div className="space-y-8 px-4 py-8 lg:px-8">
        {error && <Card className="border-agni/40 bg-agni/5"><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className="h-5 w-5 text-agni" /><div><div className="text-sm font-medium">Workboard unavailable</div><div className="text-xs text-muted-foreground">Refresh the page and try again.</div></div></CardContent></Card>}

        <Card className="overflow-hidden border-neel/20 bg-gradient-to-br from-neel/[0.08] via-background to-arav/[0.06]">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-neel" /><div><div className="text-sm font-medium">Delegate an outcome</div><div className="text-xs text-muted-foreground">Describe the result you need. The employee opens a ticket and starts the work.</div></div></div>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder={agentsLoading ? 'Loading employees…' : 'Choose employee'} /></SelectTrigger>
                <SelectContent>{executableAgents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.name} · {agent.role}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea className="min-h-10 resize-none" rows={1} value={mission} onChange={(event) => setMission(event.target.value)} placeholder="Example: Prepare a launch plan for the new collection and flag decisions I need to make." />
              <Button className="gap-1.5" onClick={handleDelegate} disabled={!selectedAgentId || !mission.trim() || delegating}>{delegating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}{delegating ? 'Delegating' : 'Delegate'}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Active work" value={issuesLoading ? '—' : String(active.length)} accent="#1F3A5F" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="Your decisions" value={issuesLoading ? '—' : String(decisions.filter((issue) => issue.status !== 'BLOCKED').length)} accent="#D4859B" icon={<CircleDot className="h-4 w-4" />} />
          <KpiCard label="Blocked" value={issuesLoading ? '—' : String(decisions.filter((issue) => issue.status === 'BLOCKED').length)} accent="#C8302A" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Completed" value={issuesLoading ? '—' : String(completed.length)} accent="#2F4F3A" icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-display text-lg tracking-tight">Active work</h2><p className="text-xs text-muted-foreground">Latest output is shown on every ticket.</p></div><span className="font-mono text-[10px] text-muted-foreground">{active.length} open</span></div>
          {issuesLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item}><CardContent className="h-44 animate-pulse bg-muted/30" /></Card>)}</div> : active.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{active.map((issue, index) => <motion.div key={issue.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><WorkCard issue={issue} onOpen={() => setSelectedIssue(issue)} onRun={() => handleRun(issue)} running={runningIssueId === issue.id} /></motion.div>)}</div> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No active work. Delegate an outcome above to start.</CardContent></Card>}
        </section>

        <section>
          <div className="mb-3"><h2 className="font-display text-lg tracking-tight">Decision queue</h2><p className="text-xs text-muted-foreground">Only work that needs your approval or unblocking appears here.</p></div>
          {decisions.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{decisions.map((issue) => <WorkCard key={issue.id} issue={issue} onOpen={() => setSelectedIssue(issue)} onRun={() => handleRun(issue)} running={runningIssueId === issue.id} />)}</div> : <Card className="border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">Clear. No approvals or blockers waiting for you.</CardContent></Card>}
        </section>
      </div>

      <Dialog open={Boolean(selectedIssue)} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selectedIssue && <>
            <DialogHeader><div className="flex items-center justify-between gap-3 pr-6"><div><DialogTitle className="font-display text-xl tracking-tight">{selectedIssue.title}</DialogTitle><DialogDescription className="mt-1 font-mono text-[10px]">{selectedIssue.code} · {selectedIssue.assignee?.name || 'Unassigned'} · {timeAgo(selectedIssue.updatedAt)}</DialogDescription></div><StatusPill status={selectedIssue.status} /></div></DialogHeader>
            <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{selectedIssue.description}</p>
            <div className="flex flex-wrap gap-2"><Select value={selectedIssue.status} onValueChange={handleStatus}><SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent>{['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'MILESTONE_REVIEW', 'BLOCKED', 'DONE'].map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}</SelectContent></Select>{selectedIssue.assignee && !selectedIssue.assignee.isHuman && <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handleRun(selectedIssue)} disabled={runningIssueId === selectedIssue.id}>{runningIssueId === selectedIssue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run employee</Button>}</div>
            <div><div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Work log</div><div className="space-y-3">{selectedIssue.comments?.length ? selectedIssue.comments.map((comment: any) => <div key={comment.id} className="border-l-2 border-border pl-3"><div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="font-medium text-foreground">{comment.authorName}</span><span>{timeAgo(comment.createdAt)}</span></div><p className="whitespace-pre-wrap text-xs leading-relaxed">{comment.body}</p></div>) : <p className="text-sm text-muted-foreground">No work logged yet.</p>}</div></div>
            {selectedIssue.status === 'BLOCKED' && <div className="flex items-start gap-2 rounded-md bg-agni/10 p-3 text-xs text-agni"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Open the ticket, make the needed decision, then move it back to In progress.</div>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
