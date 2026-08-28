'use client'

import * as React from 'react'
import {
  CalendarDays, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar, TrendingDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { use } from 'react'

const STATUS_CONFIG = {
  present: { label: 'Present', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5 border-green-500/10' },
  absent: { label: 'Absent', icon: <XCircle className="h-4 w-4" />, color: 'text-destructive', bg: 'bg-red-500/5 border-red-500/10' },
  late: { label: 'Late', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-amber-500/5 border-amber-500/10' },
  excused: { label: 'Excused', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/10' },
}

interface AttendanceData {
  child: { id: string; fullName: string }
  className: string
  attendance: { id: string; date: string; status: string; reason: string | null }[]
  stats: { total: number; present: number; absent: number; late: number; excused: number; attendanceRate: number }
  absenceReasons: Record<string, number>
  monthlyStats: Record<string, { total: number; present: number; absent: number; late: number }>
  alerts: string[]
}

export default function AttendancePage({ searchParams }: { searchParams: Promise<{ childId?: string }> }) {
  const params = use(searchParams)
  const [selectedChildId, setSelectedChildId] = React.useState(params.childId || '')
  const [viewMonth, setViewMonth] = React.useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const { user } = useAuthStore()
  const { data: dashboardData } = useApi<{
    children: { id: string; fullName: string }[]
  }>(selectedChildId ? null : `/api/parent/dashboard?userId=${user?.id || ''}`)

  React.useEffect(() => {
    if (!selectedChildId && dashboardData?.children?.length) {
      setSelectedChildId(dashboardData.children[0].id)
    }
  }, [selectedChildId, dashboardData])

  const { data, loading, error } = useApi<AttendanceData>(
    selectedChildId ? `/api/parent/attendance?childId=${selectedChildId}` : null
  )

  const children = dashboardData?.children || []

  const [year, month] = viewMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const getAttendanceForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return data?.attendance.find(a => a.date.startsWith(dateStr))
  }

  const navigateMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Track your child&apos;s attendance records</p>
        </div>
        <Select value={selectedChildId} onValueChange={setSelectedChildId}>
          <SelectTrigger className="w-[200px] forge-input-glow"><SelectValue placeholder="Select child" /></SelectTrigger>
          <SelectContent>
            {children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="p-6 text-center text-destructive">{error}</div>}
      {loading && <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>}

      {!loading && data && (
        <>
          {/* Alerts */}
          {data.alerts.length > 0 && (
            <Card className="forge-glass-surface border-amber-500/30 rounded-xl forge-card-shadow">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {data.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{data.stats.attendanceRate.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
                <Progress value={data.stats.attendanceRate} className="h-1.5 mt-1" />
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{data.stats.present}</div>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <div className="text-xl font-bold">{data.stats.absent}</div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{data.stats.late}</div>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 text-sky-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{data.stats.excused}</div>
                <p className="text-xs text-muted-foreground">Excused</p>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-white/[0.04]">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-medium text-sm min-w-[140px] text-center">{monthName}</span>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const att = getAttendanceForDay(day)
                  const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0
                  const statusCfg = att ? STATUS_CONFIG[att.status as keyof typeof STATUS_CONFIG] : null

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative ${
                        statusCfg ? 'bg-white/[0.02]' : isWeekend ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'
                      } border border-white/[0.04] transition-colors cursor-default`}
                      title={att ? `${att.status}${att.reason ? `: ${att.reason}` : ''}` : isWeekend ? 'Weekend' : 'No record'}
                    >
                      <span className={`font-medium ${statusCfg ? statusCfg.color : 'text-muted-foreground'}`}>{day}</span>
                      {att && (
                        <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${att.status === 'present' ? 'bg-green-400' : att.status === 'absent' ? 'bg-red-400' : att.status === 'late' ? 'bg-yellow-400' : 'bg-sky-400'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-3 h-3 rounded ${cfg.bg}`} />
                    <span className="text-muted-foreground">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Stats & Absence Reasons */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.monthlyStats).sort().reverse().map(([monthKey, stats]) => {
                    const rate = stats.total > 0 ? ((stats.present + stats.late) / stats.total) * 100 : 100
                    const monthLabel = new Date(monthKey + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })
                    return (
                      <div key={monthKey} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{monthLabel}</span>
                          <span className="text-muted-foreground">{rate.toFixed(0)}% ({stats.present}P / {stats.absent}A / {stats.late}L)</span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Absence Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.absenceReasons).length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="relative inline-block mb-3">
                      <div className="absolute inset-0 blur-lg bg-green-500/10 rounded-full" />
                      <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground relative" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recorded absence reasons</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.absenceReasons).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                        <span className="text-sm">{reason}</span>
                        <Badge variant="destructive" className="text-xs">{count}x</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
