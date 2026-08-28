'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Plus, Pencil, Trash2, MapPin, Clock, ChevronLeft,
  ChevronRight, Download, Loader2, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { SchoolEventItem, CalendarPageData } from '@/lib/services/school-admin-service'
import type { SchoolEventRow } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — School Calendar Page (Client)
// ============================================================================

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  academic: { label: 'Academic', color: 'text-primary', bgColor: 'bg-primary/10' },
  holiday: { label: 'Holiday', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  meeting: { label: 'Meeting', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  exam: { label: 'Exam', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  deadline: { label: 'Deadline', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900/30' },
  event: { label: 'Event', color: 'text-teal-700 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  sports: { label: 'Sports', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  cultural: { label: 'Cultural', color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarPageClientProps {
  initialData: CalendarPageData
  schoolId: string
  userId: string
}

export function CalendarPageClient({ initialData, schoolId, userId }: CalendarPageClientProps) {
  const { toast } = useToast()
  const [data, setData] = useState<CalendarPageData>(initialData)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SchoolEventItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEventType, setFormEventType] = useState('event')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formAllDay, setFormAllDay] = useState(true)
  const [formLocation, setFormLocation] = useState('')

  const fetchEvents = useCallback(async (month: number, year: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/school/calendar?month=${month + 1}&year=${year}`)
      if (res.ok) {
        const result = await res.json()
        const events: SchoolEventItem[] = ((result.data ?? []) as unknown as SchoolEventRow[]).map((e) => ({
          id: e.id, title: e.title, description: e.description,
          event_type: e.event_type, start_date: e.start_date, end_date: e.end_date,
          is_all_day: e.is_all_day, location: e.location, color: e.color, is_active: e.is_active,
        }))
        setData((prev) => ({ ...prev, events }))
      }
    } catch {
      // keep existing
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/school/calendar?month=${currentMonth + 1}&year=${currentYear}`, { signal: controller.signal })
        if (!res.ok) return
        const result = await res.json()
        if (cancelled) return
        const events: SchoolEventItem[] = ((result.data ?? []) as unknown as SchoolEventRow[]).map((e) => ({
          id: e.id, title: e.title, description: e.description,
          event_type: e.event_type, start_date: e.start_date, end_date: e.end_date,
          is_all_day: e.is_all_day, location: e.location, color: e.color, is_active: e.is_active,
        }))
        setData((prev) => ({ ...prev, events }))
      } catch { /* aborted */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true; controller.abort() }
  }, [currentMonth, currentYear])

  const handleCreate = async () => {
    if (!formTitle.trim() || !formStartDate) {
      toast({ title: 'Error', description: 'Title and start date are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/school/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription || null,
          event_type: formEventType,
          start_date: formStartDate,
          end_date: formEndDate || formStartDate,
          is_all_day: formAllDay,
          location: formLocation || null,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Event created' })
        setCreateOpen(false)
        resetForm()
        fetchEvents(currentMonth, currentYear)
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedEvent) return
    setSaving(true)
    try {
      const res = await fetch('/api/school/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEvent.id,
          title: formTitle,
          description: formDescription || null,
          event_type: formEventType,
          start_date: formStartDate,
          end_date: formEndDate || formStartDate,
          is_all_day: formAllDay,
          location: formLocation || null,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Event updated' })
        setEditOpen(false)
        fetchEvents(currentMonth, currentYear)
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/school/calendar?id=${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Success', description: 'Event deleted' })
        fetchEvents(currentMonth, currentYear)
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  const openEdit = (event: SchoolEventItem) => {
    setSelectedEvent(event)
    setFormTitle(event.title)
    setFormDescription(event.description ?? '')
    setFormEventType(event.event_type)
    setFormStartDate(event.start_date.split('T')[0])
    setFormEndDate(event.end_date.split('T')[0])
    setFormAllDay(event.is_all_day)
    setFormLocation(event.location ?? '')
    setEditOpen(true)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormEventType('event')
    setFormStartDate('')
    setFormEndDate('')
    setFormAllDay(true)
    setFormLocation('')
  }

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = currentMonth + direction
    let newYear = currentYear
    if (newMonth < 0) { newMonth = 11; newYear-- }
    if (newMonth > 11) { newMonth = 0; newYear++ }
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  const handleExport = () => {
    // Export as iCal format
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ExamForge AI//School Calendar//EN',
    ]
    for (const event of filteredEvents) {
      const startDate = event.start_date.replace(/[-:]/g, '').split('T')[0] + 'T000000'
      const endDate = event.end_date.replace(/[-:]/g, '').split('T')[0] + 'T235959'
      icalLines.push(
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${startDate}`,
        `DTEND;VALUE=DATE:${endDate}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        'END:VEVENT',
      )
    }
    icalLines.push('END:VCALENDAR')

    const blob = new Blob([icalLines.filter(Boolean).join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `school-calendar-${MONTHS[currentMonth]}-${currentYear}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Calendar exported as iCal' })
  }

  // Calendar grid computation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const filteredEvents = data.events.filter((e) =>
    filterType === 'all' || e.event_type === filterType
  )

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return filteredEvents.filter((e) => {
      const start = e.start_date.split('T')[0]
      const end = e.end_date.split('T')[0]
      return dateStr >= start && dateStr <= end
    })
  }

  const isToday = (day: number) => {
    const now = new Date()
    return now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage events, holidays, exam dates, and deadlines.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export iCal
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>Add a new event to the school calendar.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., Mid-Term Break" />
                </div>
                <div className="grid gap-2">
                  <Label>Event Type</Label>
                  <Select value={formEventType} onValueChange={setFormEventType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {data.eventTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date</Label>
                    <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g., School Hall" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional details" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        {data.eventTypes.map((t) => (
          <Button
            key={t.value}
            variant={filterType === t.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Calendar */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              {MONTHS[currentMonth]} {currentYear}
            </CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-fade-in">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Weekday headers */}
              {WEEKDAYS.map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Previous month days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`prev-${i}`} className="bg-muted/30 p-1 min-h-[80px] sm:min-h-[100px]">
                  <span className="text-xs text-foreground/35">{daysInPrevMonth - firstDayOfMonth + i + 1}</span>
                </div>
              ))}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(day)
                const today = isToday(day)
                return (
                  <div
                    key={day}
                    className={`bg-background p-1 min-h-[80px] sm:min-h-[100px] ${today ? 'ring-2 ring-primary ring-inset' : ''}`}
                  >
                    <span className={`text-xs font-medium ${today ? 'text-primary' : ''}`}>{day}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.event
                        return (
                          <div
                            key={event.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity`}
                            onClick={() => openEdit(event)}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Next month days */}
              {Array.from({ length: 42 - firstDayOfMonth - daysInMonth }).map((_, i) => (
                <div key={`next-${i}`} className="bg-muted/30 p-1 min-h-[80px] sm:min-h-[100px]">
                  <span className="text-xs text-foreground/35">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <CardTitle>Events This Month</CardTitle>
          <CardDescription>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No events this month</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredEvents
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.event
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => openEdit(event)}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${config.bgColor}`}>
                        <CalendarDays className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{new Date(event.start_date).toLocaleDateString()}</span>
                          {event.location && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>{config.label}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(event.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Event Type</Label>
              <Select value={formEventType} onValueChange={setFormEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.eventTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            {selectedEvent && (
              <Button variant="destructive" onClick={() => { handleDelete(selectedEvent.id); setEditOpen(false) }} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            )}
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
