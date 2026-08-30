'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/ekvaar'
import { toast } from '@/components/ekvaar/desktop/toast'
import { invalidateWorkforceState } from '@/lib/query-invalidation'

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const { data: approvalsData, isLoading } = useQuery({
    queryKey: ['workforce-approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals')
      if (!res.ok) return []
      const data = await res.json()
      return data.approvals || []
    },
    refetchInterval: 60_000,
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'; note?: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: note?.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resolve approval')
      return data
    },
    onSuccess: (_, variables) => {
      toast.success(`Approval ${variables.status.toLowerCase()}`)
      invalidateWorkforceState(queryClient)
      queryClient.invalidateQueries({ queryKey: ['campaign-launches'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Resolution failed')
    },
  })

  const approvals = (approvalsData || []).filter((a: any) => {
    if (filter === 'PENDING') return a.status === 'PENDING'
    if (filter === 'APPROVED') return a.status === 'APPROVED'
    return a.status === 'REJECTED' || a.status === 'REVISION_REQUESTED'
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
        <div>
          <h1 className="font-display text-xl tracking-tight">Approvals & Governance</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Action-gating approval sheets for agent spending, publishing, and external actions
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                filter === f
                  ? 'bg-white/[0.10] text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : approvals.length === 0 ? (
          <GlassPanel level={2} className="flex flex-col items-center justify-center rounded-xl p-12 text-center">
            <ShieldCheck className="h-6 w-6 text-muted-foreground/40" />
            <h3 className="mt-3 font-display text-sm tracking-tight text-muted-foreground">No {filter} Approvals</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground/60">
              When executive agents perform gated external actions or exceed spending thresholds, governance requests will appear here for founder sign-off.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {approvals.map((app: any) => (
              <GlassPanel key={app.id} level={4} className="rounded-xl p-5 space-y-4 border-amber-500/20">
                <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400">{app.code}</span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase font-medium">
                        {app.type}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-sm font-medium leading-snug">{app.title}</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(app.createdAt)}</span>
                </div>

                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <div><strong className="text-foreground">Requested by:</strong> {app.requester?.name || 'Agent'} ({app.requester?.role})</div>
                  {app.description && <div className="text-foreground/90 leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">{app.description}</div>}
                  {app.amount > 0 && <div><strong className="text-foreground">Amount:</strong> ₹{app.amount}</div>}
                  {app.campaignLaunch && <div className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.03] p-2.5"><div><strong className="text-foreground">Campaign:</strong> {app.campaignLaunch.code} · {app.campaignLaunch.status}</div>{app.campaignRevision && <div className="mt-1"><strong className="text-foreground">Evidence:</strong> revision {app.campaignRevision.revisionNum} · <span className="font-mono">{app.campaignRevision.versionHash.slice(0, 12)}</span></div>}</div>}
                  {app.marketingReadiness && !app.marketingReadiness.ready && <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2.5 text-amber-300">Publish blocked: {app.marketingReadiness.mediaMissing} media missing, {app.marketingReadiness.rightsMissing} rights checks missing, {app.marketingReadiness.policyMissing} policy checks missing, and calendar count {app.marketingReadiness.actual}/{app.marketingReadiness.expected}.</div>}
                </div>

                {Array.isArray(app.campaignRevision?.evidenceJson?.plan?.calendar) && (
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto border-t border-white/[0.06] pt-3">
                    {app.campaignRevision.evidenceJson.plan.calendar.map((content: any, index: number) => {
                      const mediaUrl = content.media_url || content.asset_url || content.image_url || content.video_url || content.preview_url
                      const isVideo = typeof mediaUrl === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)
                      return <div key={`${content.platform}-${content.scheduled_at_ist}-${index}`} className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                        {mediaUrl && (isVideo
                          ? <video src={mediaUrl} controls preload="metadata" className="max-h-72 w-full bg-black object-contain" />
                          : <img src={mediaUrl} alt={`${content.platform || 'Social'} ${content.format || 'content'} preview`} className="max-h-72 w-full bg-black object-contain" />)}
                        <div className="space-y-2 p-3 text-[11px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{content.platform}</span>
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 uppercase">{content.format}</span>
                            <span>{content.scheduled_at_ist} IST</span>
                          </div>
                          {content.caption && <p className="whitespace-pre-wrap text-foreground/90">{content.caption}</p>}
                          {!mediaUrl && <p className="rounded border border-amber-500/20 bg-amber-500/[0.05] p-2 text-amber-300">Media preview is not generated yet. Asset brief: {content.asset_brief || 'missing'}</p>}
                        </div>
                      </div>
                    })}
                  </div>
                )}

                {app.status === 'PENDING' ? (
                  <div className="space-y-3 border-t border-white/[0.06] pt-3">
                    <textarea value={notes[app.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [app.id]: event.target.value }))} placeholder="Optional founder direction, required when requesting a revision" className="min-h-16 w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-[11px] outline-none focus:border-cyan-300/25" />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => resolveMutation.mutate({ id: app.id, status: 'REJECTED', note: notes[app.id] })}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate({ id: app.id, status: 'REVISION_REQUESTED', note: notes[app.id] })}
                      disabled={resolveMutation.isPending || !notes[app.id]?.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Request Revision
                    </button>
                    <button
                      onClick={() => resolveMutation.mutate({ id: app.id, status: 'APPROVED', note: notes[app.id] })}
                      disabled={resolveMutation.isPending || Boolean(app.marketingReadiness && !app.marketingReadiness.ready)}
                      className="glass-l2 flex items-center gap-1 px-4 py-1.5 rounded-md text-[11px] font-medium text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/[0.06] pt-2 text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Status: {app.status}</span>
                    {app.resolvedAt && <span>Resolved {timeAgo(app.resolvedAt)}</span>}
                  </div>
                )}
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
