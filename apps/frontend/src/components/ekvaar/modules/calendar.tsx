'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ekvaar/desktop/toast'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  color: string
  source: string
  googleEventId?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const COLORS = ['#C8302A', '#1F3A5F', '#2F4F3A', '#D4859B', '#FF9500', '#8B7355']

const emptyForm = { title: '', description: '', date: '', startTime: '09:00', endTime: '10:00', color: '#1F3A5F' }

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function CalendarApp() {
  const [today, setToday] = useState<Date | null>(null)
  const [viewDate, setViewDate] = useState<Date | null>(null) // month anchor + selected day
  const [view, setView] = useState<'month' | 'day'>('month')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // null = creating
  const [form, setForm] = useState(emptyForm)
  const queryClient = useQueryClient()

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar'],
    queryFn: async () => {
      const r = await fetch('/api/calendar')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
  })

  const { data: googleConnected } = useQuery<{ connected: boolean }>({
    queryKey: ['google-calendar-connected'],
    queryFn: async () => {
      const r = await fetch('/api/integrations')
      if (!r.ok) return { connected: false }
      const data = await r.json()
      const all: any[] = Object.values(data.grouped || {}).flat()
      const gc = all.find((i: any) => i.toolkitSlug === 'google_calendar')
      return { connected: !!gc?.isConnected }
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/calendar/sync', { method: 'POST' })
      if (!r.ok) throw new Error('Sync failed')
      return r.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      if (data.errors?.length > 0) {
        toast.warning('Sync completed with errors', data.errors.join(', '))
      } else {
        toast.success('Calendar synced', `Pulled ${data.pulled} events, pushed ${data.pushed} events`)
      }
    },
    onError: (e: any) => toast.error('Sync failed', e.message),
  })

  // Silent auto-sync every 5 minutes while Google Calendar is connected
  useEffect(() => {
    if (!googleConnected?.connected) return
    const id = setInterval(() => {
      fetch('/api/calendar/sync', { method: 'POST' })
        .then(r => { if (r.ok) queryClient.invalidateQueries({ queryKey: ['calendar'] }) })
        .catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [googleConnected?.connected, queryClient])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      const [y, mo, d] = form.date.split('-').map(Number)
      const start = new Date(y, mo - 1, d, sh, sm)
      let end = new Date(y, mo - 1, d, eh, em)
      if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000)
      const payload = {
        title: form.title,
        description: form.description,
        start: start.toISOString(),
        end: end.toISOString(),
        color: form.color,
      }
      const r = await fetch(editingId ? `/api/calendar/${editingId}` : '/api/calendar', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success(editingId ? 'Event updated' : 'Event created')
      closeDialog()
      if (googleConnected?.connected) syncMutation.mutate()
    },
    onError: (e: any) => toast.error('Failed to save event', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event deleted')
      closeDialog()
    },
  })

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setViewDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  }, [])

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const openCreate = (date?: Date) => {
    const d = date || viewDate || new Date()
    setEditingId(null)
    setForm({ ...emptyForm, date: toDateInput(d) })
    setDialogOpen(true)
  }

  const openEdit = (e: CalendarEvent) => {
    const start = new Date(e.start)
    const end = new Date(e.end)
    setEditingId(e.id)
    setForm({
      title: e.title,
      description: e.description || '',
      date: toDateInput(start),
      startTime: toTimeInput(start),
      endTime: toTimeInput(end),
      color: e.color,
    })
    setDialogOpen(true)
  }

  const save = () => {
    if (!form.title.trim()) {
      toast.error('Title required', 'Please enter an event title')
      return
    }
    saveMutation.mutate()
  }

  if (!today || !viewDate) {
    return (
      <div>
        <PageHeader eyebrow="Calendar" title="Calendar" />
        <div className="px-4 lg:px-8 py-8">
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        </div>
      </div>
    )
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const shift = (dir: -1 | 1) => {
    if (view === 'month') setViewDate(new Date(year, month + dir, 1))
    else setViewDate(new Date(year, month, viewDate.getDate() + dir))
  }
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const eventsThisMonth = events.filter((e) => {
    const d = new Date(e.start)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const getEventsForDay = (day: number) =>
    eventsThisMonth
      .filter((e) => new Date(e.start).getDate() === day)
      .sort((a, b) => +new Date(a.start) - +new Date(b.start))

  const dayEvents = getEventsForDay(viewDate.getDate())
  const isViewToday = isCurrentMonth && viewDate.getDate() === today.getDate()

  const headerTitle = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${DAYS[viewDate.getDay()]}, ${MONTHS[month]} ${viewDate.getDate()}, ${year}`

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title={headerTitle}
        description="Schedule, routines, and agent heartbeat timings."
        actions={
          <>
            {googleConnected?.connected && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" /> New Event
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* View switcher */}
          <div className="flex rounded-md border border-border overflow-hidden">
            {(['month', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-xs capitalize ${view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="w-16" />
        </div>

        {view === 'month' ? (
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map((d) => (
                  <div key={d} className="p-2 text-center text-[10px] tracking-wider uppercase text-muted-foreground border-r border-border last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const isToday = isCurrentMonth && day === today.getDate()
                  const evts = day ? getEventsForDay(day) : []
                  return (
                    <div key={i}
                      onClick={() => {
                        if (!day) return
                        setViewDate(new Date(year, month, day))
                        setView('day')
                      }}
                      className={`min-h-[80px] p-1.5 border-r border-b border-border last:border-r-0 ${day ? 'cursor-pointer hover:bg-muted/30' : 'bg-muted/10'}`}>
                      {day && (
                        <>
                          <div className={`text-xs mb-1 ${isToday ? 'font-bold' : 'text-muted-foreground'}`}>
                            {isToday ? (
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-agni text-white text-[10px]">{day}</span>
                            ) : day}
                          </div>
                          <div className="space-y-0.5">
                            {evts.slice(0, 3).map((e) => (
                              <div key={e.id}
                                onClick={(ev) => { ev.stopPropagation(); openEdit(e) }}
                                className="text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-1 hover:opacity-70"
                                style={{ background: `${e.color}25`, color: e.color, borderLeft: `2px solid ${e.color}` }}>
                                {e.source === 'google' && <CheckCircle2 className="h-2.5 w-2.5" />}
                                {e.title}
                              </div>
                            ))}
                            {evts.length > 3 && (
                              <div className="text-[9px] text-muted-foreground px-1">+{evts.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Day view — hourly timeline */
          <Card>
            <CardContent className="p-0">
              <div className={`px-4 py-3 border-b border-border text-sm font-medium ${isViewToday ? 'text-agni' : ''}`}>
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}{isViewToday ? ' · Today' : ''}
              </div>
              <div className="relative max-h-[520px] overflow-y-auto">
                {Array.from({ length: 24 }, (_, h) => {
                  const hourEvents = dayEvents.filter(e => new Date(e.start).getHours() === h)
                  return (
                    <div key={h} className="flex border-b border-border/40 min-h-[44px] group"
                      onClick={() => {
                        const d = new Date(year, month, viewDate.getDate())
                        setEditingId(null)
                        setForm({ ...emptyForm, date: toDateInput(d), startTime: `${String(h).padStart(2, '0')}:00`, endTime: `${String((h + 1) % 24).padStart(2, '0')}:00` })
                        setDialogOpen(true)
                      }}>
                      <div className="w-16 shrink-0 text-right pr-3 pt-1 text-[10px] text-muted-foreground border-r border-border/40">
                        {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                      </div>
                      <div className="flex-1 p-1 space-y-1 cursor-pointer group-hover:bg-muted/20">
                        {hourEvents.map(e => {
                          const s = new Date(e.start); const en = new Date(e.end)
                          return (
                            <div key={e.id}
                              onClick={(ev) => { ev.stopPropagation(); openEdit(e) }}
                              className="text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:opacity-80"
                              style={{ background: `${e.color}20`, color: e.color, borderLeft: `3px solid ${e.color}` }}>
                              <span className="font-medium">{e.title}</span>
                              <span className="text-[10px] opacity-70">
                                {toTimeInput(s)}–{toTimeInput(en)}
                              </span>
                              {e.source === 'google' && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'month' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">Upcoming Events</div>
              <div className="space-y-2">
                {eventsThisMonth.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {isLoading ? 'Loading...' : 'No events this month'}
                  </div>
                ) : (
                  eventsThisMonth.slice(0, 5).map((e) => {
                    const d = new Date(e.start)
                    return (
                      <div key={e.id}
                        onClick={() => openEdit(e)}
                        className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0 group cursor-pointer hover:bg-muted/20 rounded px-1">
                        <div className="h-8 w-8 rounded-md flex flex-col items-center justify-center text-[10px]" style={{ background: `${e.color}20`, color: e.color }}>
                          <div className="font-bold">{d.getDate()}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            {e.title}
                            {e.source === 'google' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {MONTHS[d.getMonth()]} {d.getDate()}
                          </div>
                        </div>
                        <div className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">{editingId ? 'Edit Event' : 'New Event'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update or cancel this event' : 'Add an event to your calendar'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title…" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') save() }} />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description…" />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Starts</label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Ends</label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: form.color === c ? 'var(--foreground)' : 'var(--border)',
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                    }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center">
            {editingId && (
              <Button variant="ghost" className="mr-auto text-agni hover:text-agni gap-1.5"
                onClick={() => deleteMutation.mutate(editingId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={save} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {editingId ? 'Save' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
