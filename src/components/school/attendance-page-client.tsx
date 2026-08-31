'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardCheck, Users, AlertTriangle, CheckCircle2, Clock, XCircle,
  TrendingUp, Download, Save, Loader2, ChevronLeft, ChevronRight, FileDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { AttendanceRecordItem, AttendancePageData } from '@/lib/services/school-admin-service'
import type { AttendanceRecordRow } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — Attendance Tracking Page (Client)
// ============================================================================

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-green-50 dark:bg-green-9500', textColor: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950' },
  absent: { label: 'Absent', color: 'bg-destructive/100', textColor: 'text-destructive', bgColor: 'bg-destructive/10' },
  late: { label: 'Late', color: 'bg-yellow-50 dark:bg-yellow-9500', textColor: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  excused: { label: 'Excused', color: 'bg-primary/100', textColor: 'text-primary', bgColor: 'bg-primary/10' },
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendancePageClientProps {
  initialData: AttendancePageData
  schoolId: string
  userId: string
}

export function AttendancePageClient({ initialData, schoolId, userId }: AttendancePageClientProps) {
  const { toast } = useToast()
  const [data, setData] = useState<AttendancePageData>(initialData)
  const [selectedClass, setSelectedClass] = useState<string>(initialData.classes[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [studentStatuses, setStudentStatuses] = useState<Map<string, AttendanceStatus>>(new Map())

  const fetchAttendance = useCallback(async (classId: string, date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/school/attendance?class_id=${classId}&date=${date}`)
      if (res.ok) {
        const result = await res.json()
        const records: AttendanceRecordItem[] = ((result.data ?? []) as unknown as (AttendanceRecordRow & { profiles: { full_name: string } | null })[]).map((r) => ({
          id: r.id,
          student_id: r.student_id,
          student_name: r.profiles?.full_name ?? 'Unknown',
          class_id: r.class_id,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        }))

        const presentCount = records.filter((r) => r.status === 'present').length
        const absentCount = records.filter((r) => r.status === 'absent').length
        const lateCount = records.filter((r) => r.status === 'late').length
        const excusedCount = records.filter((r) => r.status === 'excused').length
        const totalRecords = records.length

        setData((prev) => ({
          ...prev,
          records,
          stats: {
            totalRecords,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
          },
        }))

        // Initialize student statuses from records
        const statusMap = new Map<string, AttendanceStatus>()
        for (const r of records) {
          statusMap.set(r.student_id, r.status as AttendanceStatus)
        }
        setStudentStatuses(statusMap)
      }
    } catch {
      // keep existing
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!selectedClass || !selectedDate) return
    let cancelled = false
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/school/attendance?class_id=${selectedClass}&date=${selectedDate}`, { signal: controller.signal })
        if (!res.ok) return
        const result = await res.json()
        if (cancelled) return
        const records: AttendanceRecordItem[] = ((result.data ?? []) as unknown as (AttendanceRecordRow & { profiles: { full_name: string } | null })[]).map((r) => ({
          id: r.id, student_id: r.student_id,
          student_name: r.profiles?.full_name ?? 'Unknown',
          class_id: r.class_id, date: r.date, status: r.status, remarks: r.remarks,
        }))
        const presentCount = records.filter((r) => r.status === 'present').length
        const absentCount = records.filter((r) => r.status === 'absent').length
        const lateCount = records.filter((r) => r.status === 'late').length
        const excusedCount = records.filter((r) => r.status === 'excused').length
        const totalRecords = records.length
        setData((prev) => ({
          ...prev, records,
          stats: { totalRecords, presentCount, absentCount, lateCount, excusedCount,
            attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0 },
        }))
        const statusMap = new Map<string, AttendanceStatus>()
        for (const r of records) statusMap.set(r.student_id, r.status as AttendanceStatus)
        setStudentStatuses(statusMap)
      } catch { /* aborted */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true; controller.abort() }
  }, [selectedClass, selectedDate])

  const toggleStatus = (studentId: string) => {
    setStudentStatuses((prev) => {
      const next = new Map(prev)
      const current = next.get(studentId) ?? 'present'
      const order: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']
      const nextIdx = (order.indexOf(current) + 1) % order.length
      next.set(studentId, order[nextIdx])
      return next
    })
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => {
      const next = new Map(prev)
      next.set(studentId, status)
      return next
    })
  }

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedDate) return
    setSaving(true)
    try {
      const records = Array.from(studentStatuses.entries()).map(([student_id, status]) => ({
        student_id,
        class_id: selectedClass,
        date: selectedDate,
        status,
      }))

      const res = await apiFetch('/api/school/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      })

      if (res.ok) {
        toast({ title: 'Success', description: `Attendance saved for ${records.length} students` })
        fetchAttendance(selectedClass, selectedDate)
      } else {
        const result = await res.json()
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleExport = () => {
    const className = data.classes.find((c) => c.id === selectedClass)?.name ?? 'Class'
    const rows = ['Student,Status,Date']
    data.records.forEach((r) => {
      rows.push(`${r.student_name},${r.status},${r.date}`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${className}-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Attendance report exported' })
  }

  const markAllPresent = () => {
    setStudentStatuses((prev) => {
      const next = new Map(prev)
      // Mark all enrolled students as present
      for (const r of data.records) {
        next.set(r.student_id, 'present')
      }
      // If no records, still mark all known students
      return next
    })
  }

  const dateNav = (direction: -1 | 1) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const { stats, chronicAbsentees } = data

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Mark daily attendance and monitor student presence.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="hover:border-primary/50 transition-all duration-200">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button size="sm" onClick={handleSaveAttendance} disabled={saving} className="forge-glow">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Attendance
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{stats.presentCount}</div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">{stats.absentCount}</div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">{stats.lateCount}</div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.attendanceRate}%</div>
            <Progress value={stats.attendanceRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Class:</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px] max-w-[45vw]">
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
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Date:</Label>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => dateNav(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm"
          />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => dateNav(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={markAllPresent}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Present
        </Button>
      </div>

      {/* Attendance Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <CardTitle>Daily Attendance — {selectedDate}</CardTitle>
          <CardDescription>Click on a student to cycle through attendance statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-fade-in">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.records.length === 0 && studentStatuses.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No attendance records for this date.</p>
              <p className="text-xs text-muted-foreground mt-1">Select a class and date to begin marking attendance.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Quick action buttons for each student */}
              {data.records.map((record) => {
                const currentStatus = studentStatuses.get(record.student_id) ?? (record.status as AttendanceStatus)
                const config = STATUS_CONFIG[currentStatus]
                return (
                  <div
                    key={record.student_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${config.bgColor} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {record.student_name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{record.student_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => {
                        const sConfig = STATUS_CONFIG[status]
                        const isActive = currentStatus === status
                        return (
                          <Button
                            key={status}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={`h-7 text-xs ${isActive ? sConfig.color + ' text-white' : ''}`}
                            onClick={() => setStatus(record.student_id, status)}
                          >
                            {sConfig.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chronic Absentees Alert */}
      {chronicAbsentees.length > 0 && (
        <Card className="border-amber-500/50 bg-yellow-50 dark:bg-yellow-950/50 dark:bg-yellow-950 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-700 dark:text-yellow-400">Chronic Absenteeism Alert</CardTitle>
            </div>
            <CardDescription>Students with &gt;20% absence rate in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chronicAbsentees.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/50 dark:bg-amber-900/20">
                  <span className="text-sm font-medium">{student.student_name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {student.absence_rate}% absence
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
