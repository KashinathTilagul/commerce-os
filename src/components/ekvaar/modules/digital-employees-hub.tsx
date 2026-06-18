'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { Cpu, Activity, Brain, Send, Zap, Clock, TrendingUp, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

interface ChatMessage {
  id: string
  from: 'agent' | 'founder'
  text: string
  ts: number
}

// Pre-canned responses per agent code
const AGENT_RESPONSES: Record<string, string[]> = {
  CEO: [
    'Acknowledged. I\'ll decompose this into actionable issues and assign them.',
    'Understood. Allocating capital and coordinating with the C-suite now.',
    'I\'ll resolve this cross-department conflict and report back within the hour.',
  ],
  CMO: [
    'Analyzing Shopify data now. ROAS projection incoming.',
    'On it. Drafting campaign brief with brand voice enforcement.',
    'Conversion drop identified — proposing A/B test on checkout step 2.',
  ],
  CTO: [
    'Deploying hotfix now. Monitoring for 24 hours.',
    'Integration complete. API health check passing.',
    'Investigating the webhook retry logic. Will report root cause shortly.',
  ],
  CFO: [
    'Auditing expenses now. Burn rate projection in progress.',
    'Budget reallocation drafted. Awaiting founder approval.',
    'Flagged inefficient spend in Marketing. Recommending reallocation.',
  ],
  COO: [
    'Checking inventory levels across all 5 houses.',
    'Supplier audit scheduled. Lead time slip detected.',
    'Restock order drafted. Awaiting budget approval.',
  ],
  CCO: [
    'Generating visual assets within the six-color palette.',
    'Brand scan complete. 0 violations found.',
    'Creative direction locked. Submitting for review.',
  ],
  CSM: [
    'Reviewing customer satisfaction scores now.',
    'Identified 3 churn risks. Proposing retention play.',
    'Support ticket resolved. CSAT up 4 points.',
  ],
  GROWTH: [
    'Experiment launched. Measuring conversion lift.',
    'Funnel analysis complete. Bottleneck at step 3.',
    'New channel identified. Projecting 12% lift.',
  ],
  RESEARCH: [
    'Compiling competitive intel report now.',
    'Market scan complete. 3 trends identified.',
    'Deep dive on Indian streetwear Q3 in progress.',
  ],
  HR: [
    'Monitoring inter-agent communication. Alignment nominal.',
    'Onboarding docs for new agent drafted.',
    'Policy update ready for review.',
  ],
  LEGAL: [
    'Reviewing content for liability. No flags.',
    'Vendor agreement reviewed. Approved.',
    'Compliance audit complete. All clear.',
  ],
  FOUNDER: [
    'Acknowledged.',
    'Make it so.',
    'Approved. Proceed.',
  ],
}

export function DigitalEmployeesHub() {
  const [selected, setSelected] = useState<any | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [agentTyping, setAgentTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const r = await fetch('/api/agents')
      return r.json()
    },
  })

  const activeCount = agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length
  const totalSpend = agents.reduce((s, a) => s + a.tokenSpend, 0)
  const totalBudget = agents.reduce((s, a) => s + a.tokenBudget, 0)
  const avgUtilization = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0
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
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Agents" value={`${agents.length - humanCount} AI · ${humanCount} Human`} accent="#1F3A5F" icon={<Cpu className="h-4 w-4" />} />
          <KpiCard label="Active Now" value={String(activeCount)} accent="#2F4F3A" icon={<Activity className="h-4 w-4" />} />
          <KpiCard label="Token Spend" value={formatINR(totalSpend)} delta={avgUtilization} deltaLabel="of budget used" accent="#C8302A" icon={<Zap className="h-4 w-4" />} />
          <KpiCard label="Avg Success Rate" value={`${agents.length > 0 ? (agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1) : 0}%`} accent="#D4859B" icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        {/* Departments */}
        {Object.entries(departments).map(([dept, deptAgents]) => (
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
                            <span className="font-mono">{Math.round((a.tokenSpend / a.tokenBudget) * 100)}%</span>
                          </div>
                          <Progress
                            value={(a.tokenSpend / a.tokenBudget) * 100}
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
        <Card className="bg-noar text-rui border-0">
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
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-display tracking-tight text-white"
                    style={{ background: selected.avatarColor }}
                  >
                    {selected.name}
                  </div>
                  <div>
                    <DialogTitle className="font-display text-2xl tracking-tight">{selected.role}</DialogTitle>
                    <DialogDescription className="font-mono text-xs">{selected.code} · {selected.name}</DialogDescription>
                  </div>
                  <div className="ml-auto"><StatusPill status={selected.status} /></div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Prime Directive</div>
                  <p className="text-sm leading-relaxed italic">"{selected.primeDirective}"</p>
                </div>

                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Description</div>
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>

                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.skills.split(',').map((s: string) => (
                      <span key={s} className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-wider uppercase rounded-sm bg-muted text-foreground">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
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
                    <Progress value={(selected.tokenSpend / selected.tokenBudget) * 100} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {Math.round((selected.tokenSpend / selected.tokenBudget) * 100)}% utilized · {selected.tokenSpend / selected.tokenBudget >= 0.8 ? '⚠ Approaching threshold' : 'Within bounds'}
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
                          const text = chatInput.trim()
                          setChatInput('')
                          // Add founder message
                          const founderMsg: ChatMessage = { id: `f-${Date.now()}`, from: 'founder', text, ts: Date.now() }
                          setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), founderMsg] }))
                          // Simulate agent response
                          setAgentTyping(true)
                          setTimeout(() => {
                            const responses = AGENT_RESPONSES[selected.code] || AGENT_RESPONSES.CEO
                            const reply = responses[Math.floor(Math.random() * responses.length)]
                            const agentMsg: ChatMessage = { id: `a-${Date.now()}`, from: 'agent', text: reply, ts: Date.now() }
                            setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), agentMsg] }))
                            setAgentTyping(false)
                            toast.info(`${selected.name} responded`, reply.slice(0, 60) + (reply.length > 60 ? '…' : ''))
                          }, 1200 + Math.random() * 1500)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5 h-8"
                      disabled={!chatInput.trim() || agentTyping}
                      onClick={() => {
                        if (!chatInput.trim() || agentTyping) return
                        const text = chatInput.trim()
                        setChatInput('')
                        const founderMsg: ChatMessage = { id: `f-${Date.now()}`, from: 'founder', text, ts: Date.now() }
                        setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), founderMsg] }))
                        setAgentTyping(true)
                        setTimeout(() => {
                          const responses = AGENT_RESPONSES[selected.code] || AGENT_RESPONSES.CEO
                          const reply = responses[Math.floor(Math.random() * responses.length)]
                          const agentMsg: ChatMessage = { id: `a-${Date.now()}`, from: 'agent', text: reply, ts: Date.now() }
                          setMessages((prev) => ({ ...prev, [selected.code]: [...(prev[selected.code] || []), agentMsg] }))
                          setAgentTyping(false)
                          toast.info(`${selected.name} responded`, reply.slice(0, 60) + (reply.length > 60 ? '…' : ''))
                        }, 1200 + Math.random() * 1500)
                      }}
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
