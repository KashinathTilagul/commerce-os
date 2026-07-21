'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
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

export function CalendarApp() {
  const [today, setToday] = useState<{ year: number; month: number; day: number } | null>(null)
  const [viewDate, setViewDate] = useState<{ year: number; month: number } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    time: '09:00',
    color: '#1F3A5F',
  })
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
      const gc = data.grouped?.productivity?.find((i: any) => i.toolkitSlug === 'google_calendar')
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!viewDate || !selectedDay) return
      const start = new Date(viewDate.year, viewDate.month, selectedDay, parseInt(newEvent.time.split(':')[0]), parseInt(newEvent.time.split(':')[1]))
      const r = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          start: start.toISOString(),
          end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          color: newEvent.color,
        }),
      })
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event created')
      setShowAdd(false)
      setNewEvent({ title: '', description: '', time: '09:00', color: '#1F3A5F' })
    },
    onError: (e: any) => toast.error('Failed to create event', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event deleted')
    },
  })

  useEffect(() => {
    const now = new Date()
    const t = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
    setToday(t)
    setViewDate({ year: t.year, month: t.month })
  }, [])

  const openAddModal = (day?: number) => {
    if (day) setSelectedDay(day)
    else setSelectedDay(today?.day || 1)
    setShowAdd(true)
  }

  const addEvent = () => {
    if (!newEvent.title.trim()) {
      toast.error('Title required', 'Please enter an event title')
      return
    }
    createMutation.mutate()
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

  const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay()
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()
  const isCurrentMonth = viewDate.year === today.year && viewDate.month === today.month

  const prevMonth = () => {
    setViewDate(viewDate.month === 0 ? { year: viewDate.year - 1, month: 11 } : { year: viewDate.year, month: viewDate.month - 1 })
  }
  const nextMonth = () => {
    setViewDate(viewDate.month === 11 ? { year: viewDate.year + 1, month: 0 } : { year: viewDate.year, month: viewDate.month + 1 })
  }
  const goToday = () => setViewDate({ year: today.year, month: today.month })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const eventsThisMonth = events.filter((e) => {
    const eventDate = new Date(e.start)
    return eventDate.getFullYear() === viewDate.year && eventDate.getMonth() === viewDate.month
  })

  const getEventsForDay = (day: number) =>
    eventsThisMonth.filter((e) => new Date(e.start).getDate() === day)

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title={`${MONTHS[viewDate.month]} ${viewDate.year}`}
        description="Schedule, routines, and agent heartbeat timings."
        actions={
          <>
            {googleConnected?.connected && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button size="sm" className="gap-1.5" onClick={() => openAddModal()}>
              <Plus className="h-3.5 w-3.5" /> New Event
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm font-display tracking-tight">
            {MONTHS[viewDate.month]} {viewDate.year}
          </div>
          <div className="w-16" />
        </div>

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
                const isToday = isCurrentMonth && day === today.day
                const dayEvents = day ? getEventsForDay(day) : []
                return (
                  <div
                    key={i}
                    onClick={() => day && openAddModal(day)}
                    className={`min-h-[80px] p-1.5 border-r border-b border-border last:border-r-0 ${
                      day ? 'cursor-pointer hover:bg-muted/30' : 'bg-muted/10'
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-xs mb-1 ${isToday ? 'font-bold' : 'text-muted-foreground'}`}>
                          {isToday ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-agni text-white text-[10px]">
                              {day}
                            </span>
                          ) : (
                            day
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className="text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-1"
                              style={{ background: `${e.color}25`, color: e.color, borderLeft: `2px solid ${e.color}` }}
                            >
                              {e.source === 'google' && <CheckCircle2 className="h-2.5 w-2.5" />}
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
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
                  const eventDate = new Date(e.start)
                  return (
                    <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0 group">
                      <div className="h-8 w-8 rounded-md flex flex-col items-center justify-center text-[10px]" style={{ background: `${e.color}20`, color: e.color }}>
                        <div className="font-bold">{eventDate.getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {e.title}
                          {e.source === 'google' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {MONTHS[eventDate.getMonth()]} {eventDate.getDate()}
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(e.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">New Event</DialogTitle>
            <DialogDescription>
              {selectedDay && `${MONTHS[viewDate.month]} ${selectedDay}, ${viewDate.year}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') addEvent() }}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Input
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Optional description…"
              />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Time</label>
              <Input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5 block">Color</label>
              <div className="flex gap-2">
                {['#C8302A', '#1F3A5F', '#2F4F3A', '#D4859B', '#FF9500', '#8B7355'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewEvent({ ...newEvent, color: c })}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: newEvent.color === c ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEvent} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
