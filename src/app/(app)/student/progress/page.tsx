'use client'

// ============================================================================
// ExamForge AI — Student Progress Dashboard Page
// ============================================================================
// Comprehensive progress tracking across all subjects with radar chart,
// subject breakdown, trends, achievement badges, study streaks, and goals.
// ============================================================================

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Recharts ──
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from 'recharts'

// ── Lucide Icons ──
import {
  BarChart3, TrendingUp, TrendingDown, Trophy, Target,
  Flame, Star, Award, CheckCircle2, Clock, BookOpen,
  Loader2, AlertCircle, Zap, GraduationCap, Medal, Sparkles,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ExamSession {
  id: string
  exam_id: string
  percentage: number | null
  grade: string | null
  total_score: number | null
  max_score: number | null
  submitted_at: string | null
  answers_completed: number
  answers_total: number
  exams?: {
    id: string
    title: string
    subject_id: string | null
    total_marks: number
    pass_mark: number
    subjects?: { id: string; name: string } | null
  } | null
}

interface Subject {
  id: string
  name: string
  code: string
}

interface SubjectPerformance {
  subjectId: string
  subjectName: string
  averageScore: number
  examCount: number
  passCount: number
  failCount: number
  trend: 'up' | 'down' | 'stable'
  sessions: { date: string; score: number }[]
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch data ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('/api/student/progress')
        if (!res.ok) throw new Error('Failed to load data')
        const data = await res.json()
        setSessions(data.sessions ?? [])
        setSubjects(data.subjects ?? [])
      } catch (err) {
        setError('Could not load progress data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Compute subject performance ──
  const subjectPerformances = useMemo<SubjectPerformance[]>(() => {
    const bySubject: Record<string, { name: string; scores: number[]; dates: string[]; passMark: number }> = {}

    for (const session of sessions) {
      const subject = session.exams?.subjects
      if (!subject || session.percentage == null) continue

      if (!bySubject[subject.id]) {
        bySubject[subject.id] = { name: subject.name, scores: [], dates: [], passMark: 50 }
      }
      bySubject[subject.id].scores.push(session.percentage)
      if (session.submitted_at) {
        bySubject[subject.id].dates.push(session.submitted_at)
      }
    }

    return Object.entries(bySubject).map(([subjectId, data]) => {
      const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0
      const passCount = data.scores.filter((s) => s >= data.passMark).length
      const failCount = data.scores.length - passCount

      // Trend: compare last 3 vs first 3 scores
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (data.scores.length >= 3) {
        const recent = data.scores.slice(-3).reduce((a, b) => a + b, 0) / 3
        const earlier = data.scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3
        if (recent > earlier + 5) trend = 'up'
        else if (recent < earlier - 5) trend = 'down'
      }

      return {
        subjectId,
        subjectName: data.name,
        averageScore: avg,
        examCount: data.scores.length,
        passCount,
        failCount,
        trend,
        sessions: data.scores.map((score, i) => ({
          date: data.dates[i] ? format(parseISO(data.dates[i]), 'MMM d') : `Exam ${i + 1}`,
          score,
        })),
      }
    }).sort((a, b) => b.averageScore - a.averageScore)
  }, [sessions])

  // ── Radar chart data ──
  const radarData = useMemo(() => {
    return subjectPerformances.map((sp) => ({
      subject: sp.subjectName.length > 10 ? sp.subjectName.substring(0, 10) + '...' : sp.subjectName,
      score: sp.averageScore,
      fullMark: 100,
    }))
  }, [subjectPerformances])

  // ── Trend data (all exams over time) ──
  const trendData = useMemo(() => {
    return sessions
      .filter((s) => s.percentage != null && s.submitted_at)
      .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
      .map((s) => ({
        date: format(parseISO(s.submitted_at!), 'MMM d'),
        score: s.percentage!,
        exam: s.exams?.title ?? 'Exam',
      }))
  }, [sessions])

  // ── Achievement badges ──
  const achievements = useMemo(() => {
    const badges: { icon: React.ReactNode; title: string; description: string; earned: boolean; color: string }[] = []

    const totalExams = sessions.length
    const avgScore = sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / sessions.length : 0
    const perfectScores = sessions.filter((s) => s.percentage === 100).length

    badges.push({ icon: <GraduationCap className="h-5 w-5" />, title: 'First Exam', description: 'Complete your first exam', earned: totalExams >= 1, color: 'text-green-600 dark:text-green-400' })
    badges.push({ icon: <Flame className="h-5 w-5" />, title: 'Five Exams', description: 'Complete 5 exams', earned: totalExams >= 5, color: 'text-orange-500' })
    badges.push({ icon: <Trophy className="h-5 w-5" />, title: 'Ten Exams', description: 'Complete 10 exams', earned: totalExams >= 10, color: 'text-yellow-600 dark:text-yellow-400' })
    badges.push({ icon: <Star className="h-5 w-5" />, title: 'High Achiever', description: 'Average score above 80%', earned: avgScore >= 80, color: 'text-yellow-500' })
    badges.push({ icon: <Target className="h-5 w-5" />, title: 'Consistent', description: 'Average score above 60%', earned: avgScore >= 60, color: 'text-primary' })
    badges.push({ icon: <Award className="h-5 w-5" />, title: 'Perfect Score', description: 'Score 100% on any exam', earned: perfectScores > 0, color: 'text-purple-500' })
    badges.push({ icon: <Zap className="h-5 w-5" />, title: 'Multi-Subject', description: 'Exams in 3+ subjects', earned: subjectPerformances.length >= 3, color: 'text-sky-500' })
    badges.push({ icon: <Medal className="h-5 w-5" />, title: 'Scholar', description: 'Average above 90%', earned: avgScore >= 90, color: 'text-rose-500' })

    return badges
  }, [sessions, subjectPerformances])

  // ── Overall stats ──
  const overallAvg = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / sessions.length) : 0
  const totalPass = sessions.filter((s) => (s.percentage ?? 0) >= 50).length
  const totalFail = sessions.length - totalPass
  const studyStreak = Math.min(sessions.length, 7) // Simplified streak calc

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /></div>
        <Skeleton className="h-80 forge-skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary neural-glow" />
            Progress Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Track your performance across all subjects</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Trophy className="h-3.5 w-3.5 mr-1" />
          {sessions.length} Exams Taken
        </Badge>
      </div>

      {error && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 border border-white/[0.04] flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{overallAvg}%</p><p className="text-xs text-foreground/60">Average score</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-2xl font-bold">{totalPass}</p><p className="text-xs text-foreground/60">Passed</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/100/10 border border-white/[0.04] flex items-center justify-center"><XIcon className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{totalFail}</p><p className="text-xs text-foreground/60">Failed</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Flame className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-2xl font-bold">{studyStreak}</p><p className="text-xs text-foreground/60">Day streak</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="radar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="radar">Performance Radar</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="badges">Achievements</TabsTrigger>
        </TabsList>

        {/* ── Radar Chart ── */}
        <TabsContent value="radar">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Subject Performance Radar</CardTitle>
              <CardDescription>Your scores across all subjects at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              {radarData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-white/[0.04]"><BookOpen className="h-8 w-8 text-primary" /></div>
                  <p className="text-sm text-muted-foreground">Take some exams to see your radar chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subject Breakdown ── */}
        <TabsContent value="subjects">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Performance by Subject</CardTitle>
              <CardDescription>Detailed breakdown of your scores per subject</CardDescription>
            </CardHeader>
            <CardContent>
              {subjectPerformances.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-white/[0.04]"><BarChart3 className="h-8 w-8 text-primary" /></div>
                  <p className="text-sm text-muted-foreground">No subject data available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjectPerformances.map((sp, i) => (
                    <motion.div key={sp.subjectId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex items-center gap-4 p-3 rounded-lg forge-glass-surface border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.06] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{sp.subjectName}</p>
                            {sp.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
                            {sp.trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                            <Badge variant="outline" className="text-xs">{sp.examCount} exam{sp.examCount > 1 ? 's' : ''}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={sp.averageScore} className="h-2 flex-1" />
                            <span className={cn('text-sm font-bold', sp.averageScore >= 60 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                              {sp.averageScore}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{sp.passCount} pass</span>
                            <span>{sp.failCount} fail</span>
                          </div>
                        </div>
                        {/* Mini bar chart for this subject */}
                        <div className="hidden sm:block w-32 h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sp.sessions.slice(-5)}>
                              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trend Over Time ── */}
        <TabsContent value="trend">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Score Trend Over Time</CardTitle>
              <CardDescription>How your scores have changed across all exams</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-white/[0.04]"><TrendingUp className="h-8 w-8 text-primary" /></div>
                  <p className="text-sm text-muted-foreground">Take some exams to see your trend</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Achievements ── */}
        <TabsContent value="badges">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Achievement Badges</CardTitle>
              <CardDescription>Milestones you&apos;ve reached on your learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {achievements.map((badge, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <div className={cn(
                      'p-4 rounded-lg border text-center transition-all hover:-translate-y-0.5 hover:border-white/[0.06]',
                      badge.earned ? 'forge-glass-surface border-white/[0.04]' : 'bg-muted/30 border-muted opacity-60',
                    )}>
                      <div className={cn('mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.04]', badge.earned ? 'bg-primary/10' : 'bg-muted')}>
                        <span className={badge.earned ? badge.color : 'text-muted-foreground'}>{badge.icon}</span>
                      </div>
                      <p className="font-medium text-sm">{badge.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
                      {badge.earned && <Badge className="mt-2 bg-green-50 dark:bg-green-950 text-white text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Earned</Badge>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple X icon component for the fail count
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}
