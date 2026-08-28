'use client'

import * as React from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Target,
  Award, AlertTriangle, CheckCircle, BookOpen, GraduationCap,
  ArrowUp, ArrowDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { use } from 'react'

interface SubjectBreakdown {
  subject: { id: string; name: string; code: string | null }
  average: number; trend: 'up' | 'down' | 'stable'; resultCount: number;
  highestScore: number; lowestScore: number;
  results: { id: string; examTitle: string; score: number; totalMarks: number; percentage: number; grade: string | null; submittedAt: string }[]
}

interface ChildProgressData {
  child: { id: string; fullName: string; email: string }
  className: string; overallAverage: number;
  subjectBreakdown: SubjectBreakdown[]
  classAverages: Record<string, number>
  strengths: string[]; improvements: string[]
}

export default function ChildProgressPage({ searchParams }: { searchParams: Promise<{ childId?: string }> }) {
  const { user } = useAuthStore()
  const params = use(searchParams)
  const [selectedChildId, setSelectedChildId] = React.useState(params.childId || '')

  const { data: dashboardData } = useApi<{
    children: { id: string; fullName: string; className: string }[]
  }>(selectedChildId ? null : `/api/parent/dashboard?userId=${user?.id || ''}`)

  React.useEffect(() => {
    if (!selectedChildId && dashboardData?.children?.length) {
      setSelectedChildId(dashboardData.children[0].id)
    }
  }, [selectedChildId, dashboardData])

  const { data, loading, error } = useApi<ChildProgressData>(
    selectedChildId ? `/api/parent/child-progress?childId=${selectedChildId}` : null
  )

  const children = dashboardData?.children || []
  const childName = children.find(c => c.id === selectedChildId)?.fullName || data?.child.fullName || 'Select Child'

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getGradeColor = (grade: string | null) => {
    if (!grade) return ''
    if (['A', 'A+'].includes(grade)) return 'text-green-600 dark:text-green-400'
    if (grade === 'B') return 'text-sky-600'
    if (grade === 'C') return 'text-yellow-600 dark:text-yellow-400'
    if (grade === 'D') return 'text-orange-600'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Child Progress</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Detailed academic progress and performance analysis</p>
        </div>
        <Select value={selectedChildId} onValueChange={setSelectedChildId}>
          <SelectTrigger className="w-[200px] forge-input-glow"><GraduationCap className="h-4 w-4 mr-2" /><SelectValue placeholder="Select child" /></SelectTrigger>
          <SelectContent>
            {children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="p-6 text-center text-destructive">{error}</div>}
      {loading && <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>}

      {!loading && data && (
        <>
          {/* Overall Performance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{data.overallAverage.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Overall Average</p>
                <Progress value={data.overallAverage} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{data.subjectBreakdown.length}</div>
                <p className="text-xs text-muted-foreground">Subjects</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{data.strengths.length}</div>
                <p className="text-xs text-muted-foreground">Strengths</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-destructive">{data.improvements.length}</div>
                <p className="text-xs text-muted-foreground">Need Improvement</p>
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.strengths.length > 0 && (
              <Card className="forge-glass-surface border-emerald-500/20 rounded-xl forge-card-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.strengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {data.improvements.length > 0 && (
              <Card className="forge-glass-surface border-amber-500/20 rounded-xl forge-card-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /> Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.improvements.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <Target className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Subject Breakdown */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04]">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                </div>
                Subject-by-Subject Breakdown
              </CardTitle>
              <CardDescription>{childName} — {data.className}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.subjectBreakdown.map(subject => {
                  const classAvg = data.classAverages[subject.subject.name]
                  const diff = classAvg ? subject.average - classAvg : null
                  return (
                    <div key={subject.subject.id} className="forge-glass-elevated border-white/[0.04] rounded-lg p-4 hover:border-white/[0.06] transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center border border-white/[0.04]">
                            <BookOpen className="h-5 w-5 text-sky-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{subject.subject.name}</h3>
                            {subject.subject.code && <p className="text-xs text-muted-foreground">{subject.subject.code}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold">{subject.average.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">Average</div>
                          </div>
                          {getTrendIcon(subject.trend)}
                          {diff !== null && (
                            <Badge variant={diff >= 0 ? 'default' : 'destructive'} className="text-xs gap-1">
                              {diff >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              vs Class: {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>0%</span>
                          {classAvg && <span>Class Avg: {classAvg.toFixed(0)}%</span>}
                          <span>100%</span>
                        </div>
                        <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="absolute h-full rounded-full bg-sky-500" style={{ width: `${subject.average}%` }} />
                          {classAvg && (
                            <div className="absolute h-full w-0.5 bg-yellow-400" style={{ left: `${classAvg}%` }} title={`Class avg: ${classAvg.toFixed(0)}%`} />
                          )}
                        </div>
                      </div>

                      {/* Score range */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Highest: {subject.highestScore.toFixed(0)}%</span>
                        <span>Lowest: {subject.lowestScore.toFixed(0)}%</span>
                        <span>{subject.resultCount} exams</span>
                      </div>

                      {/* Exam history */}
                      {subject.results.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Exam History</p>
                          {subject.results.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-2 rounded transition-colors">
                              <span className="text-muted-foreground">{r.examTitle}</span>
                              <div className="flex items-center gap-3">
                                <span>{r.score}/{r.totalMarks}</span>
                                <span className={`font-medium ${getGradeColor(r.grade)}`}>{r.grade || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !data && !error && (
        <div className="p-12 text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground relative" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Progress Data</h3>
          <p className="text-sm text-muted-foreground">Select a child to view their progress</p>
        </div>
      )}
    </div>
  )
}
