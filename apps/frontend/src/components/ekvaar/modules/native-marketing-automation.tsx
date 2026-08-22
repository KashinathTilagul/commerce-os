'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { Loader2, Send, Zap, Sparkles, Calendar, Edit, Trash2, Check, X } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'

interface MarketingTask {
  id: string
  type: 'social_post' | 'email_campaign' | 'blog_post' | 'ad_copy' | 'content_calendar'
  title: string
  instruction: string
  status: 'pending' | 'generating' | 'ready' | 'approved' | 'scheduled' | 'published' | 'rejected'
  content?: string
  hashtags?: string[]
  platforms?: string[]
  format?: string | null
  mediaArtifactIds?: string[]
  publishResults?: string[]
  scheduledAt?: string
  createdAt: string
  approvedAt?: string
}

interface MarketingAutomationState {
  tasks: MarketingTask[]
  isGenerating: boolean
  currentTask?: MarketingTask
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'threads', name: 'Threads', icon: '🧵' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦' },
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'blog', name: 'Blog', icon: '📝' },
]

const FORMATS = [
  { id: 'image', name: '📷 Image', desc: 'Single image post' },
  { id: 'carousel', name: '🎠 Carousel', desc: '3-4 image slideshow' },
  { id: 'reel', name: '🎬 Reel', desc: 'Vertical video from scene stills' },
  { id: 'story', name: '📱 Story', desc: '9:16 vertical frame' },
  { id: 'none', name: '✍️ Text only', desc: 'Caption without media' },
]

const TASK_TYPES = [
  { id: 'social_post', name: 'Social Media Post', desc: 'Single post for social platforms' },
  { id: 'content_calendar', name: 'Content Calendar', desc: 'Weekly/monthly content plan' },
  { id: 'email_campaign', name: 'Email Campaign', desc: 'Newsletter or promotional email' },
  { id: 'ad_copy', name: 'Ad Copy', desc: 'Paid advertising creative' },
  { id: 'blog_post', name: 'Blog Post', desc: 'Long-form content article' },
]

export function NativeMarketingAutomation() {
  const queryClient = useQueryClient()
  const [instruction, setInstruction] = useState('')
  const [selectedType, setSelectedType] = useState<'social_post' | 'content_calendar' | 'email_campaign' | 'ad_copy' | 'blog_post'>('social_post')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [selectedFormat, setSelectedFormat] = useState<string>('image')
  const [showForm, setShowForm] = useState(false)
  const [postingTaskId, setPostingTaskId] = useState<string | null>(null)
  const [scheduleValue, setScheduleValue] = useState('')

  const { data: tasks = [], isLoading, refetch } = useQuery<MarketingTask[]>({
    queryKey: ['native-marketing-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/marketing/automation')
      if (!res.ok) return []
      const data = await res.json()
      return data.tasks || []
    },
    refetchInterval: 10000,
  })

  const generateMutation = useMutation({
    mutationFn: async (task: { type: string; instruction: string; platforms: string[]; format: string }) => {
      const res = await fetch('/api/marketing/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Generation failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Content generated')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Generation failed')
    },
  })

  const publishNowMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/marketing/automation/${taskId}/publish`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && !data.results) throw new Error(data.error || 'Publish failed')
      return data
    },
    onSuccess: (data: any) => {
      const ok = data?.published
      const firstResult = Array.isArray(data?.results) ? data.results.join(' · ') : ''
      if (ok) toast.success(`Posted: ${firstResult}`)
      else toast.error(firstResult || 'No platform could be published — check connected accounts')
      setPostingTaskId(null)
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Publish failed')
    },
  })

  const scheduleAtMutation = useMutation({
    mutationFn: async ({ taskId, scheduledAt }: { taskId: string; scheduledAt?: string }) => {
      const res = await fetch(`/api/marketing/automation/${taskId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Scheduling failed')
      }
      return res.json()
    },
    onSuccess: (data: any) => {
      const when = data?.task?.scheduledAt ? new Date(data.task.scheduledAt).toLocaleString() : 'the scheduled time'
      toast.success(`Scheduled for ${when} — it will post automatically`)
      setPostingTaskId(null)
      setScheduleValue('')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Scheduling failed')
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/marketing/automation/${taskId}/approve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Approval failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Content approved')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Approval failed')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/marketing/automation/${taskId}/reject`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Rejection failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Content rejected')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Rejection failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/marketing/automation/${taskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      toast.success('Task deleted')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Delete failed')
    },
  })

  const handleGenerate = () => {
    if (!instruction.trim()) return
    generateMutation.mutate({
      type: selectedType,
      instruction,
      platforms: selectedPlatforms,
      format: selectedFormat,
    })
    setInstruction('')
    setShowForm(false)
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    )
  }

  const getStatusColor = (status: MarketingTask['status']) => {
    const colors: Record<string, string> = {
      pending: 'border-white/10 bg-white/05 text-muted-foreground',
      generating: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
      ready: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
      approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
      scheduled: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
      published: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
      rejected: 'border-red-400/30 bg-red-400/10 text-red-300',
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status: MarketingTask['status']) => {
    switch (status) {
      case 'generating': return <Loader2 className="h-3 w-3 animate-spin" />
      case 'ready': return <Zap className="h-3 w-3" />
      case 'approved': return <Check className="h-3 w-3" />
      case 'scheduled': return <Calendar className="h-3 w-3" />
      case 'published': return <Check className="h-3 w-3" />
      case 'rejected': return <X className="h-3 w-3" />
      default: return <Sparkles className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight">Native Marketing Automation</h2>
          <p className="text-[11px] text-muted-foreground">
            AI-powered content generation using your digital workforce — no external dependencies
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-white/05 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" /> Create Content
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <GlassPanel level={2} className="rounded-xl p-5 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm">Create Marketing Content</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground">Content Type</label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {TASK_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id as any)}
                  className={`rounded-lg border p-3 text-left transition ${
                    selectedType === t.id 
                      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' 
                      : 'border-white/07 bg-white/02 hover:bg-white/04'
                  }`}
                >
                  <div className="font-medium text-xs">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground">Media Format</label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    selectedFormat === f.id
                      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
                      : 'border-white/07 bg-white/02 hover:bg-white/04'
                  }`}
                >
                  <div className="font-medium text-xs">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                    selectedPlatforms.includes(p.id)
                      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
                      : 'border-white/07 bg-white/02 hover:bg-white/04 text-muted-foreground'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground">Instruction</label>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              rows={4}
              placeholder="Describe what you want: e.g., 'Create a product launch post for our new summer collection targeting Gen Z on Instagram and TikTok'"
              className="w-full rounded-lg bg-black/40 p-3 text-[12px] text-foreground leading-relaxed outline-none border border-white/06 focus:border-cyan-300/35 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="glass-l2 flex h-8 items-center gap-1.5 px-3 text-[11px] text-muted-foreground hover:text-foreground rounded-md transition-colors">Cancel</button>
            <button
              onClick={handleGenerate}
              disabled={!instruction.trim() || generateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Generate with AI
            </button>
          </div>
        </GlassPanel>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <GlassPanel level={2} className="rounded-xl p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <div className="text-[13px] text-muted-foreground">No marketing tasks yet</div>
          <div className="mt-1 text-[11px] text-muted-foreground/60">Click "Create Content" to generate marketing content with AI</div>
        </GlassPanel>
      ) : (
        <GlassPanel level={2} className="rounded-xl p-0 overflow-hidden">
          <div className="border-b border-white/06 px-5 py-3">
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              {tasks.length} marketing task{tasks.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="divide-y divide-white/04">
            {tasks.map(task => {
              const status = (task.status || '').toLowerCase() as MarketingTask['status']
              return (
              <div key={task.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-cyan-300/80">{task.type.toUpperCase()}</span>
                      {task.format && task.format !== 'none' && (
                        <span className="font-mono text-[10px] text-cyan-300/60">{task.format.toUpperCase()}</span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] ${getStatusColor(status)}`}>
                        <span className="flex items-center gap-1">{getStatusIcon(status)} {task.status}</span>
                      </span>
                    </div>
                    <div className="mt-1 font-medium truncate">{task.title}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>{task.platforms?.map(p => PLATFORMS.find(pl => pl.id === p)?.icon + ' ' + PLATFORMS.find(pl => pl.id === p)?.name).join(', ') || '—'}</span>
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                      {task.scheduledAt && status === 'scheduled' && (
                        <span className="text-purple-300">⏰ {new Date(task.scheduledAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {['ready', 'approved', 'scheduled'].includes(status) && (
                      <button
                        onClick={() => setPostingTaskId(postingTaskId === task.id ? null : task.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-300 px-3 h-7 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200"
                        title="Post to connected accounts"
                      >
                        <Send className="h-3 w-3" /> Post
                      </button>
                    )}
                    {status === 'ready' && (
                      <button
                        onClick={() => approveMutation.mutate(task.id)}
                        disabled={approveMutation.isPending}
                        className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
                        title="Approve"
                      >
                        {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {status === 'ready' && (
                      <button
                        onClick={() => rejectMutation.mutate(task.id)}
                        disabled={rejectMutation.isPending}
                        className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                        title="Reject"
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(task.id)}
                      disabled={deleteMutation.isPending}
                      className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Post now / Schedule options */}
                {postingTaskId === task.id && (
                  <div className="mb-3 rounded-lg border border-cyan-300/20 bg-cyan-300/05 p-3 space-y-2.5">
                    <div className="text-[11px] font-medium text-cyan-200">How do you want to post this?</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => publishNowMutation.mutate(task.id)}
                        disabled={publishNowMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
                      >
                        {publishNowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        Post now
                      </button>
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={e => setScheduleValue(e.target.value)}
                        className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-cyan-300/35"
                      />
                      <button
                        onClick={() => scheduleAtMutation.mutate({ taskId: task.id, scheduledAt: scheduleValue ? new Date(scheduleValue).toISOString() : undefined })}
                        disabled={scheduleAtMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-300/30 bg-purple-300/10 px-3 py-1.5 text-[11px] font-medium text-purple-200 transition hover:bg-purple-300/20 disabled:opacity-40"
                      >
                        {scheduleAtMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
                        Schedule
                      </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Posts to every connected account selected above, at the time you pick.</div>
                  </div>
                )}

                {/* Media thumbnails */}
                {task.mediaArtifactIds && task.mediaArtifactIds.length > 0 && (
                  <div className="mb-3 flex gap-2 flex-wrap">
                    {task.mediaArtifactIds.map(id => (
                      <img
                        key={id}
                        src={`/api/artifacts/${id}`}
                        alt={`media ${id}`}
                        className="h-24 w-24 rounded-lg border border-white/10 object-cover bg-black/30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ))}
                  </div>
                )}

                {task.content && (
                  <div className="rounded-lg border border-white/06 bg-black/20 p-3 max-h-48 overflow-auto text-[11px] text-foreground/85 whitespace-pre-wrap">
                    {task.content}
                    {task.hashtags && task.hashtags.length > 0 && (
                      <div className="mt-2 text-cyan-300/70">{task.hashtags.join(' ')}</div>
                    )}
                  </div>
                )}

                {task.publishResults && task.publishResults.length > 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                    {task.publishResults.map((r, i) => (
                      <div key={i} className={r.includes('failed') ? 'text-red-300/80' : r.includes('published') ? 'text-emerald-300/80' : ''}>{r}</div>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}