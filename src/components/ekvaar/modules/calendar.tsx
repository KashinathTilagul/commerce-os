'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '../shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CalEvent {
  day: number
  title: string
  time: string
  color: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENTS: CalEvent[] = [
  { day: 5, title: 'CMO Heartbeat', time: '09:00', color: '#D4859B' },
  { day: 8, title: 'Q3 Budget Review', time: '14:00', color: '#C8302A' },
  { day: 12, title: 'Restoration Series Launch', time: '10:00', color: '#2F4F3A' },
  { day: 15, title: 'Founder Circle Call', time: '16:00', color: '#D4859B' },
  { day: 18, title: 'Board Room Review', time: '11:00', color: '#1F3A5F' },
  { day: 18, title: 'CFO Audit', time: '15:00', color: '#2F4F3A' },
  { day: 22, title: 'Brand Scan Q3', time: '13:00', color: '#8B7355' },
  { day: 25, title: 'Supplier Audit', time: '10:30', color: '#8B7355' },
  { day: 28, title: 'Monthly P&L Close', time: '17:00', color: '#C8302A' },
]

export function CalendarApp() {
  const [today, setToday] = useState<{ year: number; month: number; day: number } | null>(null)
  const [viewDate, setViewDate] = useState<{ year: number; month: number } | null>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const now = new Date()
      const t = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
      setToday(t)
      setViewDate({ year: t.year, month: t.month })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

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

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const eventsThisMonth = EVENTS

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title={`${MONTHS[viewDate.month]} ${viewDate.year}`}
        description="Schedule, routines, and agent heartbeat timings."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Event
            </Button>
          </>
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4">
        {/* Month nav */}
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

        {/* Calendar grid */}
        <Card>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map((d) => (
                <div key={d} className="p-2 text-center text-[10px] tracking-wider uppercase text-muted-foreground border-r border-border last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = isCurrentMonth && day === today.day
                const dayEvents = day ? eventsThisMonth.filter((e) => e.day === day) : []
                return (
                  <div
                    key={i}
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
                          {dayEvents.map((e, j) => (
                            <div
                              key={j}
                              className="text-[9px] px-1 py-0.5 rounded truncate"
                              style={{ background: `${e.color}25`, color: e.color, borderLeft: `2px solid ${e.color}` }}
                            >
                              <span className="font-mono">{e.time}</span> {e.title}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">Upcoming Events</div>
            <div className="space-y-2">
              {eventsThisMonth.slice(0, 5).map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                  <div className="h-8 w-8 rounded-md flex flex-col items-center justify-center text-[10px]" style={{ background: `${e.color}20`, color: e.color }}>
                    <div className="font-bold">{e.day}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">{e.time} · {MONTHS[viewDate.month]} {e.day}</div>
                  </div>
                  <div className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
