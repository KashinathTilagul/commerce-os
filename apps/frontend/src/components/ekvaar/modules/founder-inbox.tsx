'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Inbox, CheckCircle2, XCircle, RotateCcw, Clock, AlertTriangle, Sparkles, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, KpiCard, StatusPill } from '../shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatINR, formatINRFull, timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'

const TYPE_META: Record<string, { color: string; icon: any }> = {
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
  const queryClient = useQueryClient()

  // Removed separate tab fetch in favor of local filtering on allApprovals

  const { data: allApprovals = [] } = useQuery<any[]>({
    queryKey: ['approvals', 'ALL'],
    queryFn: async () => {
      const r = await fetch('/api/approvals?inbox=ALL')
      if (!r.ok) throw new Error('Failed to fetch approvals')
      return r.json()
    },
  })

  const handleAction = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selected) return
    setActing(true)
    try {
      const r = await fetch(`/api/approvals/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!r.ok) throw new Error('Failed')
      const updated = await r.json()
      toast.success(
        action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Revision requested',
        `${selected.code} · ${selected.title}`
      )
      // Invalidate queries to refresh
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

  const pending = allApprovals.filter((a) => a.status === 'PENDING')
  const unread = allApprovals.filter((a) => !a.isRead && a.status === 'PENDING')
  const blocked = allApprovals.filter((a) => a.inbox === 'BLOCKED' || a.status === 'REVISION_REQUESTED')
  const totalAmount = pending.reduce((s, a) => s + a.amount, 0)

  const approvals = tab === 'MINE' ? pending 
    : tab === 'UNREAD' ? unread 
    : tab === 'BLOCKED' ? blocked 
    : allApprovals

  return (
    <div>
      <PageHeader
        eyebrow="Founder Inbox · Central Command"
        title="Decision Compression"
        description="The OS surfaces only what requires human attention — explicit approval requests, budget breaches, and escalations. The founder operates from here. Everything else is handled autonomously by the digital C-suite."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 bg-agni rounded-full animate-pulse-soft" />
            {pending.length} pending decisions
          </Badge>
        }
      />

      <div className="px-4 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pending Decisions" value={String(pending.length)} accent="#C8302A" icon={<Clock className="h-4 w-4" />} />
          <KpiCard label="Unread" value={String(unread.length)} accent="#D4859B" />
          <KpiCard label="Blocked / Revision" value={String(blocked.length)} accent="#1F3A5F" icon={<AlertTriangle className="h-4 w-4" />} />
          <KpiCard label="Capital at Stake" value={formatINR(totalAmount)} accent="#2F4F3A" />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="MINE">Mine <span className="ml-1 text-[10px] text-muted-foreground">{pending.length}</span></TabsTrigger>
            <TabsTrigger value="UNREAD">Unread <span className="ml-1 text-[10px] text-muted-foreground">{unread.length}</span></TabsTrigger>
            <TabsTrigger value="RECENT">Recent</TabsTrigger>
            <TabsTrigger value="BLOCKED">Blocked <span className="ml-1 text-[10px] text-muted-foreground">{blocked.length}</span></TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Approval list */}
        <div className="space-y-3">
          {approvals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
                No items in this tab. The inbox is clear.
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
                      className={`cursor-pointer hover:border-foreground/40 transition-colors ${!a.isRead && a.status === 'PENDING' ? 'border-l-4' : ''}`}
                      style={{ borderLeftColor: !a.isRead && a.status === 'PENDING' ? meta.color : undefined }}
                      onClick={() => setSelected(a)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className="h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono text-muted-foreground">{a.code}</span>
                                  <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: `${meta.color}15`, color: meta.color }}>
                                    {a.type}
                                  </span>
                                  {!a.isRead && a.status === 'PENDING' && (
                                    <span className="h-1.5 w-1.5 bg-agni rounded-full" />
                                  )}
                                </div>
                                <h3 className="font-display text-base tracking-tight">{a.title}</h3>
                              </div>
                              <StatusPill status={a.status} />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.description}</p>
                            <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
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
                                <span className="font-mono">{formatINRFull(a.amount)}</span>
                              )}
                              <span>{timeAgo(a.createdAt)}</span>
                              {a.issueCode && (
                                <span className="font-mono">→ {a.issueCode}</span>
                              )}
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

      {/* Approval detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                  <StatusPill status={selected.status} />
                </div>
                <DialogTitle className="font-display text-2xl tracking-tight">{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.type} request from {selected.requester?.name} ({selected.requester?.role})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Description</div>
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Amount</div>
                    <div className="text-lg font-display mt-0.5">{selected.amount > 0 ? formatINRFull(selected.amount) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Linked Issue</div>
                    <div className="text-sm font-mono mt-1">{selected.issueCode || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Requested</div>
                    <div className="text-sm mt-0.5">{timeAgo(selected.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Requester</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ background: selected.requester?.avatarColor || '#888' }}
                      >
                        {selected.requester?.name?.[0] || 'S'}
                      </div>
                      <span className="text-sm">{selected.requester?.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selected.status === 'PENDING' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled={acting}
                    onClick={() => handleAction('revision')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request Revision
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 text-agni hover:text-agni border-agni/40"
                    disabled={acting}
                    onClick={() => handleAction('reject')}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button
                    className="gap-1.5 bg-arav hover:bg-arav"
                    disabled={acting}
                    onClick={() => handleAction('approve')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
