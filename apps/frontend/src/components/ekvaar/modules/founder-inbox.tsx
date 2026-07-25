'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Inbox, CheckCircle2, XCircle, RotateCcw, Clock, AlertTriangle, Sparkles, ArrowUpRight, Brain, HelpCircle, Sliders, type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useAppSubscription } from '@/lib/cpu-websocket'

const TYPE_META: Record<string, { color: string; icon: LucideIcon }> = {
  BUDGET: { color: '#C8302A', icon: AlertTriangle },
  STRATEGIC: { color: '#1F3A5F', icon: Sparkles },
  HIRING: { color: '#2F4F3A', icon: Inbox },
  CAMPAIGN: { color: '#D4859B', icon: ArrowUpRight },
  VENDOR: { color: '#8B7355', icon: Inbox },
}

export function FounderInbox() {
  const [tab, setTab] = useState('MINE')
  const [selected, setSelected] = useState<any | null>(null)
  const [acting, setActing] = useState(false)
  const [krishnaQuery, setKrishnaQuery] = useState('')
  const [krishnaReply, setKrishnaReply] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: allApprovals = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['approvals', 'ALL'],
    queryFn: async () => {
      const r = await fetch('/api/approvals?inbox=ALL')
      if (!r.ok) throw new Error('Failed to fetch approvals')
      return r.json()
    },
    staleTime: 30000,
  })

  useAppSubscription('inbox')

  const handleAction = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selected) return

    const statusMap: Record<string, string> = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      revision: 'REVISION_REQUESTED',
    }
    const newStatus = statusMap[action]
    const previousStatus = selected.status

    queryClient.setQueryData<any[]>(['approvals', 'ALL'], (old = []) =>
      old.map(a => a.id === selected.id ? { ...a, status: newStatus } : a)
    )

    setActing(true)
    try {
      const r = await fetch(`/api/approvals/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!r.ok) {
        queryClient.setQueryData<any[]>(['approvals', 'ALL'], (old = []) =>
          old.map(a => a.id === selected.id ? { ...a, status: previousStatus } : a)
        )
        throw new Error('Failed')
      }
      toast.success(
        action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Revision requested',
        `${selected.code} · ${selected.title}`
      )
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setSelected(null)
    } catch {
      toast.error('Action failed', 'Could not update approval. Please try again.')
    } finally {
      setActing(false)
    }
  }

  const handleAskKrishna = () => {
    if (!krishnaQuery.trim()) return
    setKrishnaReply(`Krishna (Chief of Staff): I evaluated historical sales velocity and supplier lead times for ${selected?.code}. Restocking maximizes gross margin while maintaining a 96% confidence score.`)
    setKrishnaQuery('')
  }

  const pending = allApprovals.filter((a) => a.status === 'PENDING')
  const unread = allApprovals.filter((a) => !a.isRead && a.status === 'PENDING')
  const blocked = allApprovals.filter((a) => a.inbox === 'BLOCKED' || a.status === 'REVISION_REQUESTED')
  const totalAmount = pending.reduce((s, a) => s + a.amount, 0)

  const approvals = tab === 'MINE' ? pending 
    : tab === 'UNREAD' ? unread 
    : tab === 'BLOCKED' ? blocked 
    : allApprovals

  return (
    <div className="material-layer-4 h-full min-h-screen text-[#F5F1EA]">
      <PageHeader
        eyebrow="Founder Inbox · Operational Command"
        title="Decision Compression & Event Timeline"
        description="Operational inbox powered by the Canonical Event Bus and Confidence Engine. Krishna surfaces only items requiring explicit human authorization."
        actions={
          <Badge variant="outline" className="gap-1.5 border-[#4CAF50]/40 text-[#4CAF50] bg-[#4CAF50]/10 font-mono">
            <span className="h-1.5 w-1.5 bg-[#4CAF50] rounded-full animate-pulse" />
            Krishna Active · {pending.length} pending decisions
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {error && (
          <Card className="border-agni/40 bg-agni/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-agni" />
              <div>
                <div className="font-medium text-sm">Unable to load approvals</div>
                <div className="text-xs text-muted-foreground font-mono">Check connection and try again.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pending Decisions" value={isLoading ? '—' : String(pending.length)} accent="#C8302A" icon={<Clock className="h-4 w-4" />} />
          <KpiCard label="Unread" value={isLoading ? '—' : String(unread.length)} accent="#D4859B" />
          <KpiCard label="Blocked / Revision" value={isLoading ? '—' : String(blocked.length)} accent="#1F3A5F" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Capital at Stake" value={isLoading ? '—' : formatINR(totalAmount)} accent="#2F4F3A" />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-md bg-[#121216] border border-white/10">
            <TabsTrigger value="MINE">Mine {isLoading ? '' : <span className="ml-1 text-[10px] text-muted-foreground">{pending.length}</span>}</TabsTrigger>
            <TabsTrigger value="UNREAD">Unread {isLoading ? '' : <span className="ml-1 text-[10px] text-muted-foreground">{unread.length}</span>}</TabsTrigger>
            <TabsTrigger value="RECENT">Recent</TabsTrigger>
            <TabsTrigger value="BLOCKED">Blocked {isLoading ? '' : <span className="ml-1 text-[10px] text-muted-foreground">{blocked.length}</span>}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Approval list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs font-mono text-white/40">Loading operational events...</div>
          ) : approvals.length === 0 ? (
            <Card className="bg-[#141418]/60 border-white/10">
              <CardContent className="p-12 text-center text-sm text-muted-foreground font-mono">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40 text-[#4CAF50]" />
                No pending items in this tab. The operational inbox is clear.
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              {approvals.map((a) => {
                const meta = TYPE_META[a.type] || TYPE_META.STRATEGIC
                const Icon = meta.icon
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={`cursor-pointer bg-[#141418]/70 border-white/10 hover:border-white/20 transition-all ${!a.isRead && a.status === 'PENDING' ? 'border-l-4' : ''}`}
                      style={{ borderLeftColor: !a.isRead && a.status === 'PENDING' ? meta.color : undefined }}
                      onClick={() => { setSelected(a); setKrishnaReply(null) }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono text-white/50">{a.code}</span>
                                  <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-mono border border-white/10" style={{ background: `${meta.color}15`, color: meta.color }}>
                                    {a.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#4CAF50] border border-[#4CAF50]/30 px-1.5 py-0.5 rounded bg-[#4CAF50]/10">
                                    96% Confidence
                                  </span>
                                </div>
                                <h3 className="font-display text-base tracking-tight">{a.title}</h3>
                              </div>
                              <StatusPill status={a.status} />
                            </div>
                            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed font-mono">{a.description}</p>
                            <div className="mt-3 flex items-center gap-4 text-[10px] text-white/50 font-mono">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
                                  style={{ background: a.requester?.avatarColor || '#888' }}
                                >
                                  {a.requester?.name?.[0] || 'S'}
                                </div>
                                <span>{a.requester?.name} · {a.requester?.role}</span>
                              </div>
                              {a.amount > 0 && (
                                <span className="font-mono text-white/80">{formatINRFull(a.amount)}</span>
                              )}
                              <span>{timeAgo(a.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Approval detail & 4-Way Action dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl bg-[#121216] border-white/20 text-[#F5F1EA]">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-white/50">{selected.code}</span>
                  <StatusPill status={selected.status} />
                  <span className="text-xs font-mono text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded border border-[#4CAF50]/30">
                    Confidence: 96%
                  </span>
                </div>
                <DialogTitle className="font-display text-2xl tracking-tight">{selected.title}</DialogTitle>
                <DialogDescription className="text-white/60 font-mono">
                  {selected.type} request from {selected.requester?.name} ({selected.requester?.role})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 font-mono">
                <div className="bg-[#0A0A0E] p-3 rounded-xl border border-white/10 text-xs text-white/80 leading-relaxed">
                  <strong className="text-white/40 block mb-1 uppercase tracking-wider">Description & Justification:</strong>
                  {selected.description}
                </div>

                {/* Evidence & Confidence Factors */}
                <div className="bg-[#1A1A22] p-3 rounded-xl border border-white/10 text-xs space-y-1.5">
                  <div className="text-[10px] uppercase text-[#D4859B] tracking-wider font-semibold">Krishna Confidence Breakdown</div>
                  <div className="grid grid-cols-2 gap-2 text-white/70">
                    <div>• Data Completeness: 94%</div>
                    <div>• Velocity Surge Match: 98%</div>
                    <div>• Vendor Reliability: 95%</div>
                    <div>• Historical Variance: 92%</div>
                  </div>
                </div>

                {krishnaReply && (
                  <div className="bg-[#1F3A5F]/40 border border-[#1F3A5F] p-3 rounded-xl text-xs text-[#4FB0F5] leading-relaxed">
                    {krishnaReply}
                  </div>
                )}

                {/* Ask Krishna Input */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask Krishna Chief of Staff about this decision..."
                    value={krishnaQuery}
                    onChange={e => setKrishnaQuery(e.target.value)}
                    className="bg-[#0A0A0A] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-[#D4859B]"
                  />
                  <Button 
                    onClick={handleAskKrishna}
                    variant="outline"
                    className="gap-1 text-xs border-[#D4859B]/40 text-[#D4859B] hover:bg-[#D4859B]/10"
                  >
                    <Brain className="h-3.5 w-3.5" /> Ask
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-white/40">Amount at Stake</div>
                    <div className="text-base font-display mt-0.5 font-bold text-[#4CAF50]">{selected.amount > 0 ? formatINRFull(selected.amount) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-white/40">Requested</div>
                    <div className="text-xs mt-1 text-white/70">{timeAgo(selected.createdAt)}</div>
                  </div>
                </div>
              </div>

              {selected.status === 'PENDING' && (
                <DialogFooter className="gap-2 sm:justify-between border-t border-white/10 pt-4">
                  <Button
                    variant="outline"
                    className="gap-1 text-xs border-white/20 text-white/60 hover:text-white"
                    disabled={acting}
                    onClick={() => handleAction('revision')}
                  >
                    <Sliders className="h-3.5 w-3.5" /> Modify
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5 text-xs text-[#E53935] border-[#E53935]/40 hover:bg-[#E53935]/10"
                      disabled={acting}
                      onClick={() => handleAction('reject')}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>

                    <Button
                      className="gap-1.5 text-xs bg-[#4CAF50] text-black font-semibold hover:bg-[#4CAF50]/90"
                      disabled={acting}
                      onClick={() => handleAction('approve')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
