'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  AtSign,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Facebook,
  FileText,
  Film,
  Image as ImageIcon,
  Instagram,
  Layers3,
  Linkedin,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'
import { useWindowStore } from '@/lib/window-store'

type TaskStatus = 'pending' | 'generating' | 'ready' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'blocked'
type TaskType = 'social_post' | 'content_calendar' | 'email_campaign' | 'ad_copy' | 'blog_post'

interface MarketingTask {
  id: string
  code?: string
  type: TaskType
  title: string
  instruction: string
  status: string
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

const PLATFORM_OPTIONS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'threads', name: 'Threads', icon: AtSign },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
]

const FORMAT_OPTIONS = [
  { id: 'image', name: 'Post', detail: '1:1 image', icon: ImageIcon },
  { id: 'carousel', name: 'Carousel', detail: '3–4 slides', icon: Layers3 },
  { id: 'reel', name: 'Reel', detail: '9:16 video', icon: Film },
  { id: 'story', name: 'Story', detail: '9:16 frame', icon: CalendarDays },
  { id: 'none', name: 'Text', detail: 'Copy only', icon: FileText },
]

const TASK_OPTIONS: Array<{ id: TaskType; name: string }> = [
  { id: 'social_post', name: 'Social content' },
  { id: 'content_calendar', name: 'Content calendar' },
  { id: 'ad_copy', name: 'Campaign copy' },
  { id: 'email_campaign', name: 'Email campaign' },
  { id: 'blog_post', name: 'Article' },
]

const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Gujarati', 'Malayalam', 'Punjabi']

const STATUS_META: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: 'Queued', className: 'border-white/10 bg-white/[0.04] text-muted-foreground' },
  generating: { label: 'Generating', className: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200' },
  ready: { label: 'Needs approval', className: 'border-amber-300/25 bg-amber-300/10 text-amber-200' },
  approved: { label: 'Approved', className: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' },
  scheduled: { label: 'Scheduled', className: 'border-violet-300/25 bg-violet-300/10 text-violet-200' },
  published: { label: 'Published', className: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' },
  rejected: { label: 'Rejected', className: 'border-red-300/25 bg-red-300/10 text-red-200' },
  blocked: { label: 'Media blocked', className: 'border-red-300/25 bg-red-300/10 text-red-200' },
}

function taskStatus(task?: MarketingTask): TaskStatus {
  const status = String(task?.status || 'pending').toLowerCase() as TaskStatus
  return STATUS_META[status] ? status : 'pending'
}

function platformName(id: string) {
  return PLATFORM_OPTIONS.find((platform) => platform.id === id)?.name || id
}

function formatName(id?: string | null) {
  return FORMAT_OPTIONS.find((format) => format.id === id)?.name || 'Content'
}

function originalInstruction(instruction = '') {
  return instruction.replace(/\n\nLanguage: [^.]+\. Audience: India\. Timezone: IST\.$/, '')
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${meta.className}`}>
      {status === 'generating' ? <Loader2 className="h-3 w-3 animate-spin" /> : status === 'blocked' ? <AlertTriangle className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {meta.label}
    </span>
  )
}

export function NativeMarketingAutomation() {
  const storedView = useWindowStore((state) => state.appState.marketing?.view)
  const storedTaskId = useWindowStore((state) => state.appState.marketing?.selectedTaskId)
  const setAppState = useWindowStore((state) => state.setAppState)
  const [instruction, setInstruction] = useState('')
  const [selectedType, setSelectedType] = useState<TaskType>('social_post')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [selectedFormat, setSelectedFormat] = useState('image')
  const [language, setLanguage] = useState('English')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'review' | 'scheduled' | 'published'>('all')
  const [scheduleValue, setScheduleValue] = useState('')
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  const { data: tasks = [], isLoading, refetch } = useQuery<MarketingTask[]>({
    queryKey: ['native-marketing-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/marketing/automation')
      if (!response.ok) throw new Error('Could not load content')
      const data = await response.json()
      return data.tasks || []
    },
    refetchInterval: 10000,
  })

  const selectedTask = tasks.find((task) => task.id === storedTaskId) || tasks[0]
  const composing = storedView === 'compose' || (!isLoading && tasks.length === 0)

  useEffect(() => setActiveMediaIndex(0), [selectedTask?.id])

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const status = taskStatus(task)
    const matchesFilter = filter === 'all'
      || (filter === 'review' && ['ready', 'blocked', 'rejected'].includes(status))
      || status === filter
    const query = search.trim().toLowerCase()
    return matchesFilter && (!query || `${task.title} ${task.type} ${task.platforms?.join(' ')}`.toLowerCase().includes(query))
  }), [filter, search, tasks])

  const openTask = (taskId: string) => setAppState('marketing', { selectedTaskId: taskId, view: 'review' })
  const startBrief = (task?: MarketingTask) => {
    if (task) {
      setInstruction(originalInstruction(task.instruction))
      setSelectedType(task.type || 'social_post')
      setSelectedPlatforms(task.platforms?.length ? task.platforms : ['instagram'])
      setSelectedFormat(task.format || 'image')
    }
    setAppState('marketing', { view: 'compose' })
  }

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/marketing/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          instruction: `${instruction.trim()}\n\nLanguage: ${language}. Audience: India. Timezone: IST.`,
          platforms: selectedPlatforms,
          format: selectedFormat,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Generation failed')
      return data
    },
    onSuccess: async (data) => {
      toast.success(data.blockedReason ? 'Copy is ready; media needs attention' : 'Content is ready for review')
      await refetch()
      setInstruction('')
      setAppState('marketing', { selectedTaskId: data.task?.id || null, view: 'review' })
    },
    onError: (error: Error) => toast.error(error.message || 'Generation failed'),
  })

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/marketing/automation/${taskId}/approve`, { method: 'POST' })
      if (!response.ok) throw new Error('Approval failed')
    },
    onSuccess: () => { toast.success('Approved for publishing'); refetch() },
    onError: (error: Error) => toast.error(error.message),
  })

  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/marketing/automation/${taskId}/reject`, { method: 'POST' })
      if (!response.ok) throw new Error('Rejection failed')
    },
    onSuccess: () => { toast.success('Sent back for revision'); refetch() },
    onError: (error: Error) => toast.error(error.message),
  })

  const publishMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/marketing/automation/${taskId}/publish`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok && !data.results) throw new Error(data.error || 'Publishing failed')
      return data
    },
    onSuccess: (data) => {
      const result = Array.isArray(data?.results) ? data.results.join(' · ') : ''
      if (data?.published) toast.success(result || 'Published')
      else toast.error(result || 'No connected platform could publish')
      refetch()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const scheduleMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!scheduleValue) throw new Error('Choose an IST date and time')
      const response = await fetch(`/api/marketing/automation/${taskId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(scheduleValue).toISOString() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Scheduling failed')
      return data
    },
    onSuccess: () => { toast.success('Scheduled in IST'); setScheduleValue(''); refetch() },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/marketing/automation/${taskId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      toast.success('Content removed')
      setAppState('marketing', { selectedTaskId: null })
      refetch()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const togglePlatform = (platform: string) => setSelectedPlatforms((current) =>
    current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-x-auto bg-background">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Marketing workspace</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-[10px] text-muted-foreground">India · IST</span>
          </div>
          <h1 className="mt-1 font-display text-xl tracking-tight">Content Studio</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-[10px] text-muted-foreground lg:flex">
            <span><b className="text-foreground">{tasks.filter((task) => taskStatus(task) === 'ready').length}</b> awaiting approval</span>
            <span><b className="text-foreground">{tasks.filter((task) => taskStatus(task) === 'scheduled').length}</b> scheduled</span>
          </div>
          <button onClick={() => startBrief()} className="flex h-9 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-200">
            <Plus className="h-4 w-4" /> New content
          </button>
        </div>
      </header>

      {composing ? (
        <Composer
          instruction={instruction}
          setInstruction={setInstruction}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedPlatforms={selectedPlatforms}
          togglePlatform={togglePlatform}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          language={language}
          setLanguage={setLanguage}
          generating={generateMutation.isPending}
          canGenerate={instruction.trim().length >= 10 && selectedPlatforms.length > 0}
          onGenerate={() => generateMutation.mutate()}
          onCancel={() => setAppState('marketing', { view: 'review' })}
          hasTasks={tasks.length > 0}
        />
      ) : (
        <div className="grid min-h-0 min-w-[980px] flex-1 grid-cols-[270px_minmax(400px,1fr)_300px]">
          <TaskRail
            tasks={visibleTasks}
            selectedTaskId={selectedTask?.id}
            isLoading={isLoading}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            onSelect={openTask}
          />
          <CreativeCanvas task={selectedTask} activeMediaIndex={activeMediaIndex} setActiveMediaIndex={setActiveMediaIndex} />
          <ReviewPanel
            task={selectedTask}
            scheduleValue={scheduleValue}
            setScheduleValue={setScheduleValue}
            onApprove={() => selectedTask && approveMutation.mutate(selectedTask.id)}
            onReject={() => selectedTask && rejectMutation.mutate(selectedTask.id)}
            onPublish={() => selectedTask && publishMutation.mutate(selectedTask.id)}
            onSchedule={() => selectedTask && scheduleMutation.mutate(selectedTask.id)}
            onRevise={() => selectedTask && startBrief(selectedTask)}
            onDelete={() => selectedTask && window.confirm('Delete this content permanently?') && deleteMutation.mutate(selectedTask.id)}
            busy={approveMutation.isPending || rejectMutation.isPending || publishMutation.isPending || scheduleMutation.isPending || deleteMutation.isPending}
          />
        </div>
      )}
    </div>
  )
}

function Composer({
  instruction, setInstruction, selectedType, setSelectedType, selectedPlatforms, togglePlatform,
  selectedFormat, setSelectedFormat, language, setLanguage, generating, canGenerate, onGenerate, onCancel, hasTasks,
}: {
  instruction: string; setInstruction: (value: string) => void
  selectedType: TaskType; setSelectedType: (value: TaskType) => void
  selectedPlatforms: string[]; togglePlatform: (value: string) => void
  selectedFormat: string; setSelectedFormat: (value: string) => void
  language: string; setLanguage: (value: string) => void
  generating: boolean; canGenerate: boolean; onGenerate: () => void; onCancel: () => void; hasTasks: boolean
}) {
  return (
    <div className="grid min-h-0 min-w-[860px] flex-1 grid-cols-[minmax(420px,1.05fr)_minmax(360px,0.95fr)] overflow-y-auto">
      <section className="border-r border-white/[0.07] px-7 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">New brief</div>
            <h2 className="mt-1 font-display text-2xl">What are we making?</h2>
          </div>
          {hasTasks && <button onClick={onCancel} className="text-[11px] text-muted-foreground hover:text-foreground">Back to studio</button>}
        </div>

        <div className="space-y-6">
          <Field label="Content goal">
            <div className="flex flex-wrap gap-2">
              {TASK_OPTIONS.map((option) => (
                <button key={option.id} onClick={() => setSelectedType(option.id)} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${selectedType === option.id ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'}`}>
                  {option.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Format">
            <div className="grid grid-cols-5 gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button key={option.id} onClick={() => setSelectedFormat(option.id)} className={`rounded-xl border p-3 text-left transition ${selectedFormat === option.id ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                    <Icon className={`h-4 w-4 ${selectedFormat === option.id ? 'text-cyan-200' : 'text-muted-foreground'}`} />
                    <div className="mt-3 text-[11px] font-medium">{option.name}</div>
                    <div className="mt-0.5 text-[9px] text-muted-foreground">{option.detail}</div>
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid grid-cols-[1fr_180px] gap-5">
            <Field label="Publish to">
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((platform) => {
                  const Icon = platform.icon
                  const active = selectedPlatforms.includes(platform.id)
                  return (
                    <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] transition ${active ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
                      <Icon className="h-3.5 w-3.5" /> {platform.name}
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Language">
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[11px] outline-none focus:border-cyan-300/40">
                {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Creative direction">
            <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={7} placeholder="Describe the product, campaign goal, offer, audience insight, visual direction, and call to action…" className="w-full resize-none rounded-xl border border-white/10 bg-black/25 p-4 text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:border-cyan-300/40" />
          </Field>

          <button onClick={onGenerate} disabled={!canGenerate || generating} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-[12px] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Building copy and media…' : 'Generate draft'}
          </button>
        </div>
      </section>

      <section className="flex min-h-[640px] items-center justify-center bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,0.08),transparent_42%)] p-8">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Draft blueprint</span><span>Brand context attached</span>
          </div>
          <div className={`mx-auto overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0c0d] shadow-[0_30px_90px_rgba(0,0,0,0.45)] ${['story', 'reel'].includes(selectedFormat) ? 'max-w-[300px] aspect-[9/16]' : 'aspect-square'}`}>
            <div className="flex h-full flex-col items-center justify-center p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                {selectedFormat === 'reel' ? <Film className="h-6 w-6 text-cyan-200" /> : selectedFormat === 'carousel' ? <Layers3 className="h-6 w-6 text-cyan-200" /> : <Sparkles className="h-6 w-6 text-cyan-200" />}
              </div>
              <h3 className="mt-5 font-display text-xl">Your creative will appear here</h3>
              <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted-foreground">The studio will generate {formatName(selectedFormat).toLowerCase()} media and platform-ready copy using the organization’s brand context.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                {selectedPlatforms.map((platform) => <span key={platform} className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] text-muted-foreground">{platformName(platform)}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>{children}</div>
}

function TaskRail({ tasks, selectedTaskId, isLoading, search, setSearch, filter, setFilter, onSelect }: {
  tasks: MarketingTask[]; selectedTaskId?: string; isLoading: boolean; search: string; setSearch: (value: string) => void
  filter: 'all' | 'review' | 'scheduled' | 'published'; setFilter: (value: 'all' | 'review' | 'scheduled' | 'published') => void; onSelect: (id: string) => void
}) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-white/[0.07] bg-black/[0.12]">
      <div className="space-y-3 border-b border-white/[0.07] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content" className="h-9 w-full rounded-lg border border-white/10 bg-black/25 pl-9 pr-3 text-[11px] outline-none focus:border-cyan-300/35" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'review', 'scheduled', 'published'] as const).map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-2 py-1 text-[9px] capitalize transition ${filter === item ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{item}</button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : tasks.length === 0 ? (
          <div className="p-6 text-center text-[10px] leading-relaxed text-muted-foreground">No content matches this view.</div>
        ) : tasks.map((task) => {
          const status = taskStatus(task)
          const active = task.id === selectedTaskId
          return (
            <button key={task.id} onClick={() => onSelect(task.id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${active ? 'border-cyan-300/30 bg-cyan-300/[0.08]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{task.code || formatName(task.format)}</span>
                <span className={`h-2 w-2 rounded-full ${status === 'blocked' || status === 'rejected' ? 'bg-red-400' : status === 'ready' ? 'bg-amber-300' : status === 'published' || status === 'approved' ? 'bg-emerald-400' : 'bg-violet-300'}`} />
              </div>
              <div className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug">{task.title}</div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{formatName(task.format)}</span>
                <span>{new Date(task.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function CreativeCanvas({ task, activeMediaIndex, setActiveMediaIndex }: { task?: MarketingTask; activeMediaIndex: number; setActiveMediaIndex: (index: number) => void }) {
  if (!task) return <main className="flex items-center justify-center text-sm text-muted-foreground">Select a draft to review.</main>
  const status = taskStatus(task)
  const media = task.mediaArtifactIds || []
  const activeId = media[Math.min(activeMediaIndex, Math.max(0, media.length - 1))]
  const vertical = ['story', 'reel'].includes(task.format || '')

  return (
    <main className="min-h-0 overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><TaskStatusBadge status={status} /><span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{formatName(task.format)}</span></div>
            <h2 className="mt-2 font-display text-xl tracking-tight">{task.title}</h2>
            <div className="mt-1 text-[10px] text-muted-foreground">{task.platforms?.map(platformName).join(' · ')}</div>
          </div>
          <button onClick={() => navigator.clipboard.writeText(`${task.content || ''}\n\n${task.hashtags?.join(' ') || ''}`).then(() => toast.success('Caption copied'))} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[10px] text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /> Copy</button>
        </div>

        <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),rgba(0,0,0,0.16)_60%)] p-5">
          {activeId ? (
            task.format === 'reel' ? <video src={`/api/artifacts/${activeId}`} controls className="max-h-[560px] max-w-full rounded-xl bg-black shadow-2xl" /> : <img src={`/api/artifacts/${activeId}`} alt={`${task.title} creative ${activeMediaIndex + 1}`} className={`rounded-xl object-contain shadow-2xl ${vertical ? 'max-h-[560px]' : 'max-h-[520px] max-w-full'}`} />
          ) : (
            <div className="max-w-sm text-center">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status === 'blocked' ? 'bg-red-400/10 text-red-300' : 'bg-white/[0.05] text-muted-foreground'}`}>{status === 'blocked' ? <AlertTriangle className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}</div>
              <div className="mt-4 text-[13px] font-medium">{status === 'blocked' ? 'Media generation needs attention' : 'Text-only content'}</div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{status === 'blocked' ? 'The caption was generated, but the media provider did not return a usable asset. Create a revision after checking the image or video model connection.' : 'This draft has no attached media.'}</p>
            </div>
          )}
          {media.length > 1 && (
            <>
              <button onClick={() => setActiveMediaIndex((activeMediaIndex - 1 + media.length) % media.length)} className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setActiveMediaIndex((activeMediaIndex + 1) % media.length)} className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50"><ChevronRight className="h-4 w-4" /></button>
            </>
          )}
        </div>

        {media.length > 1 && <div className="mt-3 flex justify-center gap-2">{media.map((id, index) => <button key={id} onClick={() => setActiveMediaIndex(index)} className={`h-12 w-12 overflow-hidden rounded-lg border ${index === activeMediaIndex ? 'border-cyan-300' : 'border-white/10'}`}><img src={`/api/artifacts/${id}`} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Platform copy</div>
          <div className="whitespace-pre-wrap text-[12px] leading-6 text-foreground/90">{task.content || 'Copy is still being generated.'}</div>
          {!!task.hashtags?.length && <div className="mt-4 text-[11px] leading-relaxed text-cyan-300/80">{task.hashtags.join(' ')}</div>}
        </div>
      </div>
    </main>
  )
}

function ReviewPanel({ task, scheduleValue, setScheduleValue, onApprove, onReject, onPublish, onSchedule, onRevise, onDelete, busy }: {
  task?: MarketingTask; scheduleValue: string; setScheduleValue: (value: string) => void
  onApprove: () => void; onReject: () => void; onPublish: () => void; onSchedule: () => void; onRevise: () => void; onDelete: () => void; busy: boolean
}) {
  if (!task) return <aside className="border-l border-white/[0.07]" />
  const status = taskStatus(task)
  const mediaReady = task.format === 'none' || Boolean(task.mediaArtifactIds?.length)
  const canApprove = status === 'ready'
  const canPublish = ['approved', 'scheduled'].includes(status)
  const canSchedule = status === 'approved'

  return (
    <aside className="min-h-0 overflow-y-auto border-l border-white/[0.07] bg-black/[0.12] p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Release checklist</div>
      <div className="mt-4 space-y-2">
        <ReadinessRow label="Brand copy" ready={Boolean(task.content)} detail={task.content ? 'Generated' : 'Missing'} />
        <ReadinessRow label="Media asset" ready={mediaReady} detail={mediaReady ? `${task.mediaArtifactIds?.length || 0} attached` : 'Provider blocked'} />
        <ReadinessRow label="Destinations" ready={Boolean(task.platforms?.length)} detail={task.platforms?.map(platformName).join(', ') || 'None'} />
        <ReadinessRow label="Founder approval" ready={['approved', 'scheduled', 'published'].includes(status)} detail={STATUS_META[status].label} />
      </div>

      {status === 'blocked' && (
        <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-red-200"><AlertTriangle className="h-3.5 w-3.5" /> Media provider blocked</div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">Check the connected image/video model, then create a revision. This draft cannot be approved without its requested media.</p>
        </div>
      )}

      <div className="mt-6 border-t border-white/[0.07] pt-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Schedule · IST</div>
        <input type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} className="mt-3 h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-[11px] outline-none focus:border-cyan-300/35" />
        <button onClick={onSchedule} disabled={!canSchedule || !scheduleValue || busy} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-violet-300/25 bg-violet-300/[0.08] text-[11px] font-medium text-violet-200 disabled:cursor-not-allowed disabled:opacity-35"><Clock3 className="h-3.5 w-3.5" /> Schedule</button>
      </div>

      <div className="mt-6 space-y-2">
        {canApprove && <button onClick={onApprove} disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 text-[11px] font-semibold text-emerald-950 disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Approve content</button>}
        {canPublish && <button onClick={onPublish} disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 text-[11px] font-semibold text-slate-950 disabled:opacity-40"><Send className="h-4 w-4" /> Publish now</button>}
        <button onClick={onRevise} disabled={busy} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-[11px] text-foreground hover:bg-white/[0.04] disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" /> Create revision</button>
        {canApprove && <button onClick={onReject} disabled={busy} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[11px] text-red-300 hover:bg-red-300/[0.06] disabled:opacity-40"><X className="h-3.5 w-3.5" /> Reject</button>}
      </div>

      {!!task.publishResults?.length && <div className="mt-6 border-t border-white/[0.07] pt-4"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Publishing receipt</div>{task.publishResults.map((result, index) => <div key={index} className={`mt-2 text-[10px] leading-relaxed ${result.toLowerCase().includes('failed') ? 'text-red-300' : 'text-muted-foreground'}`}>{result}</div>)}</div>}

      <button onClick={onDelete} disabled={busy} className="mt-8 flex items-center gap-2 text-[10px] text-muted-foreground hover:text-red-300 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Delete content</button>
    </aside>
  )
}

function ReadinessRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ready ? 'bg-emerald-300/10 text-emerald-300' : 'bg-red-300/10 text-red-300'}`}>{ready ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</div>
      <div className="min-w-0"><div className="text-[10px] font-medium">{label}</div><div className="mt-0.5 truncate text-[9px] text-muted-foreground">{detail}</div></div>
    </div>
  )
}
