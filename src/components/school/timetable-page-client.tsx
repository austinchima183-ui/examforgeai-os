'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Clock, BookOpen, Users, AlertTriangle, Plus, Pencil, Trash2,
  Printer, Download, Loader2, GripVertical, CheckCircle2, XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { TimetableSlotItem, TimetablePageData } from '@/lib/services/school-admin-service'
import type { TimetableSlotRow } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — Timetable Page (Client)
// ============================================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = [
  { num: 1, time: '08:00-08:45' },
  { num: 2, time: '08:45-09:30' },
  { num: 3, time: '09:30-10:15' },
  { num: 4, time: '10:15-11:00', isBreak: false },
  { num: 5, time: '11:00-11:45' },
  { num: 6, time: '11:45-12:30' },
  { num: 7, time: '12:30-01:15' },
  { num: 8, time: '01:15-02:00' },
]
const BREAK_PERIOD = { num: 0, time: '10:15-10:45', label: 'Break' }

interface TimetablePageClientProps {
  initialData: TimetablePageData
  schoolId: string
}

export function TimetablePageClient({ initialData, schoolId }: TimetablePageClientProps) {
  const { toast } = useToast()
  const [data, setData] = useState<TimetablePageData>(initialData)
  const [selectedClass, setSelectedClass] = useState<string>(initialData.classes[0]?.id ?? '')
  const [conflicts, setConflicts] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlotItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formSubject, setFormSubject] = useState('')
  const [formTeacher, setFormTeacher] = useState('')
  const [formDay, setFormDay] = useState(0)
  const [formPeriod, setFormPeriod] = useState(1)
  const [formRoom, setFormRoom] = useState('')

  const fetchTimetable = useCallback(async (classId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/school/timetable?class_id=${classId}`)
      if (res.ok) {
        const result = await res.json()
        const slots = ((result.data ?? []) as unknown as (TimetableSlotRow & { subjects: { name: string } | null; profiles: { full_name: string } | null })[]).map((s) => ({
          id: s.id,
          class_id: s.class_id,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
          subject_name: s.subjects?.name ?? null,
          teacher_name: s.profiles?.full_name ?? null,
          day_of_week: s.day_of_week,
          period_number: s.period_number,
          start_time: s.start_time,
          end_time: s.end_time,
          room: s.room,
          is_break: s.is_break,
        }))
        setData((prev) => ({ ...prev, slots }))
        setConflicts(result.conflicts ?? [])
      }
    } catch {
      // keep existing
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/school/timetable?class_id=${selectedClass}`, { signal: controller.signal })
        if (!res.ok) return
        const result = await res.json()
        if (cancelled) return
        const slots = ((result.data ?? []) as unknown as (TimetableSlotRow & { subjects: { name: string } | null; profiles: { full_name: string } | null })[]).map((s) => ({
          id: s.id, class_id: s.class_id, subject_id: s.subject_id,
          teacher_id: s.teacher_id, subject_name: s.subjects?.name ?? null,
          teacher_name: s.profiles?.full_name ?? null, day_of_week: s.day_of_week,
          period_number: s.period_number, start_time: s.start_time,
          end_time: s.end_time, room: s.room, is_break: s.is_break,
        }))
        setData((prev) => ({ ...prev, slots }))
        setConflicts(result.conflicts ?? [])
      } catch { /* aborted or network error */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true; controller.abort() }
  }, [selectedClass])

  const getSlot = (day: number, period: number) =>
    data.slots.find((s) => s.day_of_week === day && s.period_number === period && !s.is_break)

  const handleCreateSlot = async () => {
    if (!selectedClass) return
    setSaving(true)
    try {
      const period = PERIODS.find((p) => p.num === formPeriod)
      const [start, end] = (period?.time ?? '08:00-08:45').split('-')
      const res = await fetch('/api/school/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
          subject_id: formSubject || null,
          teacher_id: formTeacher || null,
          day_of_week: formDay,
          period_number: formPeriod,
          start_time: start,
          end_time: end,
          room: formRoom || null,
          is_break: false,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Time slot added' })
        setCreateOpen(false)
        fetchTimetable(selectedClass)
      } else {
        toast({ title: 'Conflict Detected', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleUpdateSlot = async () => {
    if (!selectedSlot) return
    setSaving(true)
    try {
      const res = await fetch('/api/school/timetable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSlot.id,
          subject_id: formSubject || null,
          teacher_id: formTeacher || null,
          room: formRoom || null,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Slot updated' })
        setEditOpen(false)
        if (selectedClass) fetchTimetable(selectedClass)
      } else {
        toast({ title: 'Conflict', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/school/timetable?id=${slotId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Success', description: 'Slot removed' })
        if (selectedClass) fetchTimetable(selectedClass)
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  const openEditSlot = (slot: TimetableSlotItem) => {
    setSelectedSlot(slot)
    setFormSubject(slot.subject_id ?? '')
    setFormTeacher(slot.teacher_id ?? '')
    setFormDay(slot.day_of_week)
    setFormPeriod(slot.period_number)
    setFormRoom(slot.room ?? '')
    setEditOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    const className = data.classes.find((c) => c.id === selectedClass)?.name ?? 'Class'
    const csvRows = ['Day,Period,Subject,Teacher,Room,Time']
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const slot = getSlot(DAYS.indexOf(day), period.num)
        csvRows.push(`${day},${period.num},${slot?.subject_name ?? ''},${slot?.teacher_name ?? ''},${slot?.room ?? ''},${period.time}`)
      }
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timetable-${className}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Timetable exported as CSV' })
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Weekly timetable view with conflict detection.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timetable Slot</DialogTitle>
                <DialogDescription>Assign a subject and teacher to a time slot.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Day</Label>
                    <Select value={String(formDay)} onValueChange={(v) => setFormDay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Period</Label>
                    <Select value={String(formPeriod)} onValueChange={(v) => setFormPeriod(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((p) => <SelectItem key={p.num} value={String(p.num)}>Period {p.num} ({p.time})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select value={formSubject} onValueChange={setFormSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {data.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Teacher</Label>
                  <Select value={formTeacher} onValueChange={setFormTeacher}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {data.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Room</Label>
                  <Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="e.g., Room 101" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSlot} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Slot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Class Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Class:</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {data.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Scheduling Conflicts Detected</p>
                <ul className="mt-1 text-sm text-destructive/80 space-y-1">
                  {conflicts.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
          <CardDescription>
            {data.classes.find((c) => c.id === selectedClass)?.name ?? 'Select a class'} — Drag slots to reschedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-fade-in">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !selectedClass ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a class to view its timetable</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted text-left w-24">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Time</div>
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="border p-2 bg-muted text-center font-medium">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Break row */}
                  <tr>
                    <td className="border p-2 bg-yellow-50 dark:bg-yellow-950 font-medium text-yellow-700 dark:text-yellow-400 text-xs">
                      {BREAK_PERIOD.time}
                    </td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="border p-1 bg-yellow-50/50 dark:bg-yellow-950/50 text-center text-xs text-yellow-600 dark:text-yellow-400">
                        Break
                      </td>
                    ))}
                  </tr>
                  {PERIODS.map((period) => (
                    <tr key={period.num}>
                      <td className="border p-2 bg-muted/50 font-medium text-xs">
                        Period {period.num}<br />
                        <span className="text-muted-foreground">{period.time}</span>
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const slot = getSlot(dayIdx, period.num)
                        return (
                          <td key={dayIdx} className="border p-1 min-w-[120px]">
                            {slot ? (
                              <div
                                className="rounded-md p-2 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors group relative"
                                onClick={() => openEditSlot(slot)}
                              >
                                <p className="font-medium text-xs truncate">{slot.subject_name ?? 'Free'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{slot.teacher_name ?? ''}</p>
                                {slot.room && (
                                  <p className="text-[10px] text-muted-foreground truncate">📍 {slot.room}</p>
                                )}
                                <button
                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id) }}
                                >
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="rounded-md p-2 border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors text-center"
                                onClick={() => {
                                  setFormDay(dayIdx)
                                  setFormPeriod(period.num)
                                  setFormSubject('')
                                  setFormTeacher('')
                                  setFormRoom('')
                                  setCreateOpen(true)
                                }}
                              >
                                <Plus className="h-3.5 w-3.5 mx-auto text-foreground/60" />
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Slot Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Slot</DialogTitle>
            <DialogDescription>Change subject, teacher, or room for this slot.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Subject</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {data.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Teacher</Label>
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {data.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room</Label>
              <Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSlot} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
