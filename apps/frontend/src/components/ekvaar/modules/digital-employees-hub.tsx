'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { Cpu, Activity, Send, Zap, TrendingUp, Sparkles, Edit3, Save, X, Loader2, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useAppSubscription } from '@/lib/cpu-websocket'

interface ChatMessage {
  id: string
  from: 'agent' | 'founder'
  text: string
  ts: number
}

function AgentSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-16 bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0
}

export function DigitalEmployeesHub() {
  const [selected, setSelected] = useState<any | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [agentTyping, setAgentTyping] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: agents = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const r = await fetch('/api/agents')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 30000,
  })

  useAppSubscription('agents')

  const activeCount = agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length
  const totalSpend = agents.reduce((s, a) => s + a.tokenSpend, 0)
  const totalBudget = agents.reduce((s, a) => s + a.tokenBudget, 0)
  const avgUtilization = Math.round(safeDiv(totalSpend, totalBudget) * 100)
  const humanCount = agents.filter((a) => a.isHuman).length

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentTyping, selected])

  // Group by department
  const departments: Record<string, any[]> = {}
  for (const a of agents) {
    if (!departments[a.department]) departments[a.department] = []
    departments[a.department].push(a)
  }

  // Edit handlers
  const handleStartEdit = () => {
    setEditData({
      name: selected.name,
      role: selected.role,
      primeDirective: selected.primeDirective,
      description: selected.description,
      skills: selected.skills,
      status: selected.status,
      avatarColor: selected.avatarColor,
    })
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    if (!selected || !editData) return
    const previousData = { ...selected }
    
    queryClient.setQueryData<any[]>(['agents'], (old = []) =>
      old.map(a => a.id === selected.id ? { ...a, ...editData } : a)
    )
    setSelected({ ...selected, ...editData })
    
    setSaving(true)
    try {
      const r = await fetch(`/api/agents/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (!r.ok) {
        queryClient.setQueryData<any[]>(['agents'], (old = []) =>
          old.map(a => a.id === selected.id ? previousData : a)
        )
        setSelected(previousData)
        throw new Error('Failed')
      }
      const updated = await r.json()
      toast.success('Agent updated', `${updated.name} profile saved`)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setSelected(updated)
      setEditMode(false)
      setEditData(null)
    } catch {
      toast.error('Save failed', 'Could not update agent')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setEditData(null)
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || agentTyping || !selected) return
    const text = chatInput.trim()
    setChatInput('')
    
    // Add founder message immediately
    const founderMsg: ChatMessage = { id: `f-${Date.now()}`, from: 'founder', text, ts: Date.now() }
    setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), founderMsg] }))
    
    setAgentTyping(true)
    try {
      const r = await fetch(`/api/agents/${selected.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await r.json()
      
      const reply = data.reply || data.error || 'Connection failed.'
      const agentMsg: ChatMessage = { id: `a-${Date.now()}`, from: 'agent', text: reply, ts: Date.now() }
      
      setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), agentMsg] }))
      if (data.reply) {
        toast.info(`${selected.name} responded`, reply.slice(0, 60) + (reply.length > 60 ? '…' : ''))
      } else {
        toast.error('Agent offline', reply)
      }
    } catch (e) {
      const errorMsg: ChatMessage = { id: `a-${Date.now()}`, from: 'agent', text: 'Error: Could not reach agent.', ts: Date.now() }
      setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), errorMsg] }))
      toast.error('Connection failed', 'Could not reach agent')
    } finally {
      setAgentTyping(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Digital Employees Hub"
        title="The Digital C-Suite"
        description="A pre-configured workforce of 12 autonomous AI agents. Each has a Soul (system prompt), Playbook (SOPs), Experience (past learnings), Memory, and Metrics. They wake on routines, events, or mentions — execute heartbeats — and go back to sleep."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 bg-arav rounded-full animate-pulse-soft" />
            {activeCount} of {agents.length} active
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {error && (
          <Card className="border-agni/40 bg-agni/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-agni" />
              <div>
                <div className="font-medium text-sm">Unable to load agents</div>
                <div className="text-xs text-muted-foreground">Check your connection and try again.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Agents" value={isLoading ? '—' : `${agents.length - humanCount} AI · ${humanCount} Human`} accent="#1F3A5F" icon={<Cpu className="h-4 w-4" />} />
          <KpiCard label="Active Now" value={isLoading ? '—' : String(activeCount)} accent="#2F4F3A" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="Token Spend" value={isLoading ? '—' : formatINR(totalSpend)} delta={avgUtilization} deltaLabel="of budget used" accent="#C8302A" icon={<Zap className="h-4 w-4" />} />
          <KpiCard label="Avg Success Rate" value={isLoading ? '—' : `${agents.length > 0 ? (agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1) : 0}%`} accent="#D4859B" icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        {/* Departments */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <AgentSkeleton key={i} />)}
          </div>
        ) : Object.entries(departments).map(([dept, deptAgents]) => (
          <div key={dept}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-base tracking-tight">{dept}</h2>
              <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{deptAgents.length} {deptAgents.length === 1 ? 'agent' : 'agents'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {deptAgents.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className="cursor-pointer hover:border-foreground/40 transition-colors h-full"
                    onClick={() => setSelected(a)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div
                            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-display tracking-tight text-white"
                            style={{ background: a.avatarColor }}
                          >
                            {a.name}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusRing(a.status)}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-sm tracking-tight truncate">{a.role}</span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">{a.code}</div>
                          <div className="mt-1.5"><StatusPill status={a.status} /></div>
                        </div>
                      </div>

                      {a.currentTask ? (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1">Working on</div>
                          <div className="text-xs leading-snug line-clamp-2">{a.currentTask}</div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                          Last heartbeat: {timeAgo(a.lastHeartbeat)}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="text-muted-foreground">Tasks Today</div>
                          <div className="font-mono text-sm">{a.tasksToday}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Success</div>
                          <div className="font-mono text-sm">{a.successRate}%</div>
                        </div>
                      </div>

                      {!a.isHuman && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-mono">{Math.round(safeDiv(a.tokenSpend, a.tokenBudget) * 100)}%</span>
                          </div>
                          <Progress
                            value={safeDiv(a.tokenSpend, a.tokenBudget) * 100}
                            className="h-1"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {/* Architecture explainer */}
        <Card className="bg-noor text-rui border-0">
          <CardContent className="p-8">
            <div className="text-[10px] tracking-[0.3em] uppercase text-rui/50 mb-3">Heartbeat Engine</div>
            <div className="font-display text-xl tracking-tight mb-4">Agents wake autonomously. They don't wait for prompts.</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-[10px] tracking-wider uppercase text-arav mb-2">Routines</div>
                <p className="text-rui/70 leading-relaxed">Scheduled cron jobs. CMO runs a daily metrics review at 9 AM. CFO audits expenses every Monday.</p>
              </div>
              <div>
                <div className="text-[10px] tracking-wider uppercase text-gulabi mb-2">Event Triggers</div>
                <p className="text-rui/70 leading-relaxed">Wake when a dependent task finishes or a metric drops. Stripe webhook fails → CTO wakes instantly.</p>
              </div>
              <div>
                <div className="text-[10px] tracking-wider uppercase text-agni mb-2">Mentions</div>
                <p className="text-rui/70 leading-relaxed">Tagged in an Issue comment by another agent or human. CEO assigns PAP-39 → CMO wakes immediately.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent profile dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setEditMode(false); setEditData(null) } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-display tracking-tight text-white"
                    style={{ background: editMode ? editData?.avatarColor : selected.avatarColor }}
                  >
                    {editMode ? editData?.name?.[0] : selected.name?.[0]}
                  </div>
                  <div className="flex-1">
                    {editMode ? (
                      <Input
                        className="font-display text-xl h-8"
                        value={editData?.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Agent name"
                      />
                    ) : (
                      <DialogTitle className="font-display text-2xl tracking-tight">{selected.name}</DialogTitle>
                    )}
                    <DialogDescription className="font-mono text-xs">
                      {selected.code} · {editMode ? (
                        <Input className="inline-flex h-6 w-48 text-xs font-mono" value={editData?.role || ''} onChange={(e) => setEditData({ ...editData, role: e.target.value })} />
                      ) : selected.role}
                    </DialogDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {editMode ? (
                      <Select value={editData?.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                        <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="RUNNING">Running</SelectItem>
                          <SelectItem value="IDLE">Idle</SelectItem>
                          <SelectItem value="PAUSED">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusPill status={selected.status} />
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Edit / Save / Cancel buttons */}
              <div className="flex justify-end gap-2 -mt-2 mb-2">
                {editMode ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 h-7" onClick={handleCancelEdit} disabled={saving}>
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                    <Button size="sm" className="gap-1.5 h-7 bg-arav hover:bg-arav" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5 h-7" onClick={handleStartEdit}>
                    <Edit3 className="h-3 w-3" /> Edit Soul & Skills
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Prime Directive / Soul */}
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Prime Directive (Soul)
                  </div>
                  {editMode ? (
                    <Textarea
                      className="text-sm leading-relaxed"
                      rows={4}
                      value={editData?.primeDirective || ''}
                      onChange={(e) => setEditData({ ...editData, primeDirective: e.target.value })}
                      placeholder="The agent's core mission and soul..."
                    />
                  ) : (
                    <p className="text-sm leading-relaxed italic bg-muted/30 p-3 rounded-md">"{selected.primeDirective}"</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Description</div>
                  {editMode ? (
                    <Textarea
                      className="text-sm leading-relaxed"
                      rows={3}
                      value={editData?.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Agent responsibilities and bio..."
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{selected.description}</p>
                  )}
                </div>

                {/* Skills */}
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Skills</div>
                  {editMode ? (
                    <Input
                      className="text-sm"
                      value={editData?.skills || ''}
                      onChange={(e) => setEditData({ ...editData, skills: e.target.value })}
                      placeholder="Comma-separated skills..."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.split(',').map((s: string) => (
                        <span key={s} className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm bg-muted text-foreground">
                          {s.replace(/_/g, ' ').trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {selected.currentTask && (
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Currently Working On</div>
                    <div className="text-sm p-3 bg-muted/50 rounded-md">{selected.currentTask}</div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Tasks Today</div>
                    <div className="font-display text-lg mt-0.5">{selected.tasksToday}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Lifetime Tasks</div>
                    <div className="font-display text-lg mt-0.5">{selected.tasksTotal.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Success Rate</div>
                    <div className="font-display text-lg mt-0.5">{selected.successRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Last Heartbeat</div>
                    <div className="text-xs mt-1.5">{timeAgo(selected.lastHeartbeat)}</div>
                  </div>
                </div>

                {!selected.isHuman && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Token Budget</span>
                      <span className="font-mono">{formatINRFull(selected.tokenSpend)} / {formatINRFull(selected.tokenBudget)}</span>
                    </div>
                    <Progress value={safeDiv(selected.tokenSpend, selected.tokenBudget) * 100} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {Math.round(safeDiv(selected.tokenSpend, selected.tokenBudget) * 100)}% utilized · {safeDiv(selected.tokenSpend, selected.tokenBudget) >= 0.8 ? 'Approaching threshold' : 'Within bounds'}
                    </div>
                  </div>
                )}

                {/* Direct chat interface */}
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Direct Chat</div>
                  <div className="border border-border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                    {/* Initial agent message */}
                    {(messages[selected.code] || []).length === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0" style={{ background: selected.avatarColor }}>
                          {selected.name?.[0]}
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded-md">
                          Heartbeat complete. Analyzed today's data. Ready for next assignment.
                        </div>
                      </div>
                    )}
                    {/* Conversation */}
                    {(messages[selected.code] || []).map((m) => (
                      <div key={m.id} className={`flex items-start gap-2 ${m.from === 'founder' ? 'flex-row-reverse' : ''}`}>
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0"
                          style={{ background: m.from === 'founder' ? '#0A0A0A' : selected.avatarColor }}
                        >
                          {m.from === 'founder' ? 'F' : selected.name?.[0]}
                        </div>
                        <div
                          className={`text-xs p-2 rounded-md max-w-[80%] ${
                            m.from === 'founder' ? 'bg-foreground text-background' : 'bg-muted/50'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {agentTyping && (
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0" style={{ background: selected.avatarColor }}>
                          {selected.name?.[0]}
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded-md flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-pulse" />
                          <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 text-xs border border-border rounded-md bg-background"
                      placeholder={`Message ${selected.name}…`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && chatInput.trim() && !agentTyping) {
                          handleSendChat()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5 h-8"
                      disabled={!chatInput.trim() || agentTyping}
                      onClick={handleSendChat}
                    >
                      <Send className="h-3 w-3" /> Send
                    </Button>
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

function statusRing(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-arav',
    RUNNING: 'bg-gulabi animate-pulse-soft',
    IDLE: 'bg-muted-foreground/40',
    PAUSED: 'bg-agni',
    ERROR: 'bg-agni',
  }
  return map[status] || 'bg-muted-foreground/40'
}
