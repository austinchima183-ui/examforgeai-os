'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/tables/data-table'
import { ReportExportToolbar } from '@/components/reports/report-export-toolbar'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Loader2,
  AlertCircle,
  School,
  BookOpen,
  GraduationCap,
  DollarSign,
  Calendar,
  BarChart3,
  Download,
  FileText,
  Filter,
} from 'lucide-react'
import type { SchoolReport, TeacherReport, StudentReport, RevenueReport } from '@/lib/services/reports-service'

// ============================================================================
// ExamForge AI — Enhanced Reports Page
// ============================================================================
// Client component with live Supabase data. Full export toolbar with
// PDF, Excel, CSV, Print, Share, and Schedule options.
// Premium AI OS visual treatment applied.
// ============================================================================

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schoolReports, setSchoolReports] = useState<SchoolReport[]>([])
  const [teacherReports, setTeacherReports] = useState<TeacherReport[]>([])
  const [studentReports, setStudentReports] = useState<StudentReport[]>([])
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [activeTab, setActiveTab] = useState('schools')

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/reports?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()

      setSchoolReports(data.schoolReports ?? [])
      setTeacherReports(data.teacherReports ?? [])
      setStudentReports(data.studentReports ?? [])
      setRevenueReport(data.revenueReport ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const schoolColumns: ColumnDef<SchoolReport, unknown>[] = [
    { accessorKey: 'schoolName', header: 'School' },
    { accessorKey: 'totalStudents', header: 'Students' },
    { accessorKey: 'totalTeachers', header: 'Teachers' },
    { accessorKey: 'totalExams', header: 'Exams' },
    { accessorKey: 'avgScore', header: 'Avg Score', cell: ({ row }) => <span>{row.getValue('avgScore')}%</span> },
    { accessorKey: 'passRate', header: 'Pass Rate', cell: ({ row }) => <span>{row.getValue('passRate')}%</span> },
    { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <span>{'\u20A6'}{(row.getValue('revenue') as number).toLocaleString()}</span> },
  ]

  const teacherColumns: ColumnDef<TeacherReport, unknown>[] = [
    { accessorKey: 'teacherName', header: 'Teacher' },
    { accessorKey: 'examsCreated', header: 'Exams Created' },
    { accessorKey: 'questionsCreated', header: 'Questions Created' },
    { accessorKey: 'totalStudents', header: 'Students' },
  ]

  const studentColumns: ColumnDef<StudentReport, unknown>[] = [
    { accessorKey: 'studentName', header: 'Student' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'examsCompleted', header: 'Exams' },
    { accessorKey: 'avgScore', header: 'Avg Score', cell: ({ row }) => <span>{row.getValue('avgScore')}%</span> },
    { accessorKey: 'highestScore', header: 'Highest', cell: ({ row }) => <span>{row.getValue('highestScore')}%</span> },
    { accessorKey: 'passRate', header: 'Pass Rate', cell: ({ row }) => <span>{row.getValue('passRate')}%</span> },
  ]

  // Get current tab data for export toolbar
  function getCurrentExportData(): { data: Record<string, unknown>[]; title: string; type: 'student' | 'class' | 'school' | 'exam' } {
    switch (activeTab) {
      case 'schools':
        return { data: schoolReports as unknown as Record<string, unknown>[], title: 'School Reports', type: 'school' }
      case 'teachers':
        return { data: teacherReports as unknown as Record<string, unknown>[], title: 'Teacher Reports', type: 'class' }
      case 'students':
        return { data: studentReports as unknown as Record<string, unknown>[], title: 'Student Reports', type: 'student' }
      default:
        return { data: [], title: 'Report', type: 'school' }
    }
  }

  const currentExport = getCurrentExportData()

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating reports...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="forge-glass-surface border border-destructive/30 rounded-xl forge-card-shadow">
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-destructive/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 backdrop-blur-sm border-white/[0.04]">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-medium">Failed to generate reports</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4 forge-input-glow" onClick={fetchReports}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reportTypes = [
    { key: 'schools', label: 'Schools', icon: School, count: schoolReports.length, color: 'primary', description: 'Performance metrics across schools' },
    { key: 'teachers', label: 'Teachers', icon: BookOpen, count: teacherReports.length, color: 'neural', description: 'Teacher activity and contributions' },
    { key: 'students', label: 'Students', icon: GraduationCap, count: studentReports.length, color: 'ember', description: 'Student results and progress' },
  ] as const

  return (
    <div className="space-y-6 print-area animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export detailed reports across your platform.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 forge-glow border-primary/30" asChild>
          <a href="#" onClick={(e) => { e.preventDefault(); const el = document.querySelector('[data-export-trigger]') as HTMLElement; el?.click() }}>
            <Download className="h-4 w-4" />
            Export All
          </a>
        </Button>
      </div>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Premium Filters Bar */}
      <div className="forge-glass-elevated border-white/[0.04] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-lg border-white/[0.04] bg-secondary/50 px-3 text-xs forge-input-glow focus:outline-none"
              placeholder="From"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-lg border-white/[0.04] bg-secondary/50 px-3 text-xs forge-input-glow focus:outline-none"
              placeholder="To"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports} className="gap-2 h-8 forge-input-glow border-white/[0.04]">
            <Calendar className="h-3.5 w-3.5" />
            Apply
          </Button>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {reportTypes.map((type) => {
          const colorClasses = {
            primary: { bg: 'bg-primary/5', border: 'border-primary/15', iconBg: 'bg-primary/15', iconBorder: 'border-primary/20', iconColor: 'text-primary' },
            neural: { bg: 'bg-neural/5', border: 'border-neural/15', iconBg: 'bg-neural/15', iconBorder: 'border-neural/20', iconColor: 'text-neural' },
            ember: { bg: 'bg-ember/5', border: 'border-ember/15', iconBg: 'bg-ember/15', iconBorder: 'border-ember/20', iconColor: 'text-ember' },
          }[type.color]
          const Icon = type.icon
          return (
            <button
              key={type.key}
              onClick={() => setActiveTab(type.key)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 group ${
                activeTab === type.key
                  ? `forge-glass-surface ${colorClasses.border} forge-card-shadow forge-glow`
                  : `forge-glass-surface border-white/[0.04] forge-card-shadow hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06]`
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-9 w-9 rounded-lg ${colorClasses.iconBg} flex items-center justify-center border ${colorClasses.iconBorder}`}>
                  <Icon className={`h-4 w-4 ${colorClasses.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-2xl font-bold tracking-tight">{type.count}</span>
                <span className="text-xs text-muted-foreground">records</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Revenue Summary */}
      {revenueReport && (
        <Card className="relative overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Revenue Summary</CardTitle>
                <CardDescription>{revenueReport.period}</CardDescription>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 backdrop-blur-sm border border-white/[0.04]">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold tracking-tight">{'\u20A6'}{revenueReport.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs text-muted-foreground mb-1">Total Payments</p>
                <p className="text-2xl font-bold tracking-tight">{revenueReport.totalPayments}</p>
              </div>
              <div className="p-4 rounded-xl bg-ember/5 border border-ember/15">
                <p className="text-xs text-muted-foreground mb-1">Successful</p>
                <p className="text-2xl font-bold tracking-tight">{revenueReport.successfulPayments}</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/15">
                <p className="text-xs text-muted-foreground mb-1">Failed</p>
                <p className="text-2xl font-bold tracking-tight">{revenueReport.failedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Toolbar - Premium Glass Bar */}
      <div className="forge-glass-elevated border-white/[0.04] rounded-xl p-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-white/[0.04]">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium">{currentExport.title}</span>
            <span className="text-xs text-muted-foreground ml-2">{currentExport.data.length} records</span>
          </div>
        </div>
        <ReportExportToolbar
          data={currentExport.data}
          reportTitle={currentExport.title}
          reportType={currentExport.type}
        />
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50 border border-white/[0.04]">
          <TabsTrigger value="schools" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <School className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <BookOpen className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <GraduationCap className="h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schools" className="mt-4">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <DataTable
              columns={schoolColumns}
              data={schoolReports}
              searchKey="schoolName"
              searchPlaceholder="Search schools..."
              emptyMessage="No school reports"
              emptyDescription="No school data available for the selected period."
            />
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="mt-4">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <DataTable
              columns={teacherColumns}
              data={teacherReports}
              searchKey="teacherName"
              searchPlaceholder="Search teachers..."
              emptyMessage="No teacher reports"
              emptyDescription="No teacher data available for the selected period."
            />
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <DataTable
              columns={studentColumns}
              data={studentReports}
              searchKey="studentName"
              searchPlaceholder="Search students..."
              emptyMessage="No student reports"
              emptyDescription="No student data available for the selected period."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
