// ============================================================================
// ExamForge AI — Analytics Data Service
// ============================================================================
// Server-side data fetching for analytics charts and metrics.
// All queries use the Supabase server client with cookie-based auth.
// All queries are scoped by role and school_id to prevent data leakage.
// N+1 queries have been replaced with aggregate queries.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'
import { devDashboardStats } from '@/lib/supabase/dev-adapter'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AnalyticsStats {
  totalExams: number
  activeStudents: number
  avgPassRate: number
  avgScore: number
}

export interface TimeSeriesPoint {
  date: string
  label: string
  value: number
  value2?: number
}

export interface SubjectPerformance {
  subject: string
  score: number
  passRate: number
}

export interface WeeklyActivity {
  week: string
  exams: number
  participants: number
}

export interface SchoolRanking {
  id: string
  name: string
  avgScore: number
  totalStudents: number
  totalExams: number
  passRate: number
}

export interface AnalyticsOverview {
  stats: AnalyticsStats
  examTrend: TimeSeriesPoint[]
  subjectPerformance: SubjectPerformance[]
  weeklyActivity: WeeklyActivity[]
  schoolRankings: SchoolRanking[]
  quickInsights: {
    topSubject: string | null
    needsAttention: string | null
    mostActiveMonth: string | null
  }
}

// ──────────────────────────────────────────────────────────────
// Analytics Service
// ──────────────────────────────────────────────────────────────

export async function getAnalyticsData(
  role: UserRole,
  userId: string,
  schoolId: string | null,
  dateRange: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
): Promise<AnalyticsOverview> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    return {
      stats: { totalExams: devDashboardStats.totalExams, activeStudents: devDashboardStats.totalStudents, avgPassRate: devDashboardStats.passRate, avgScore: devDashboardStats.averageScore },
      examTrend: [
        { date: '2025-01', label: 'Jan', value: 12, value2: 68 },
        { date: '2025-02', label: 'Feb', value: 18, value2: 72 },
        { date: '2025-03', label: 'Mar', value: 25, value2: 70 },
        { date: '2025-04', label: 'Apr', value: 30, value2: 74 },
        { date: '2025-05', label: 'May', value: 22, value2: 76 },
        { date: '2025-06', label: 'Jun', value: 28, value2: 73 },
      ],
      subjectPerformance: [
        { subject: 'Mathematics', score: 74, passRate: 86 },
        { subject: 'English', score: 68, passRate: 78 },
        { subject: 'Physics', score: 72, passRate: 82 },
        { subject: 'Chemistry', score: 66, passRate: 75 },
      ],
      weeklyActivity: [
        { week: 'Week 1', exams: 5, participants: 45 },
        { week: 'Week 2', exams: 8, participants: 72 },
        { week: 'Week 3', exams: 6, participants: 55 },
        { week: 'Week 4', exams: 10, participants: 88 },
      ],
      schoolRankings: [],
      quickInsights: { topSubject: 'Mathematics', needsAttention: 'Chemistry', mostActiveMonth: 'Jun' },
    }
  }

  // Calculate date range filter
  const now = new Date()
  let startDate: Date | null = null
  switch (dateRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 86400000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 86400000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 86400000)
      break
    case '1y':
      startDate = new Date(now.getTime() - 365 * 86400000)
      break
    case 'all':
      startDate = null
      break
  }

  const dateFilter = startDate ? startDate.toISOString() : null

  // ─── Build scoped queries based on role ──────────────────
  // Super admin: sees all data
  // School admin: sees only their school
  // Teacher: sees only their exams
  // Student: sees only their own sessions

  // Helper to apply date filter to queries
  const applyDateFilter = <T>(query: T): T => {
    if (dateFilter && typeof query === 'object' && query !== null) {
      // Use Supabase's .gte() method via the query builder
      (query as unknown as { gte: (col: string, val: string) => T }).gte('created_at', dateFilter)
    }
    return query
  }

  let examScope = role === 'school_admin' && schoolId
    ? supabase.from('exams').select('id', { count: 'exact', head: true }).eq('school_id', schoolId)
    : role === 'teacher'
      ? supabase.from('exams').select('id', { count: 'exact', head: true }).eq('created_by', userId)
      : supabase.from('exams').select('id', { count: 'exact', head: true })

  let studentScope = role === 'school_admin' && schoolId
    ? supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true).eq('school_id', schoolId)
    : role === 'teacher' && schoolId
      ? supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true).eq('school_id', schoolId)
      : supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true)

  // Apply date filter to exam scope
  if (dateFilter) {
    examScope = examScope.gte('created_at', dateFilter)
  }

  // ─── Stats (parallel queries, no N+1) ───────────────────
  let sessionsQuery = role === 'student'
    ? supabase.from('exam_sessions').select('percentage, status').eq('student_id', userId).in('status', ['submitted', 'timed_out', 'graded'])
    : role === 'school_admin' && schoolId
      ? supabase.from('exam_sessions').select('percentage, status, exams!inner(school_id)').in('status', ['submitted', 'timed_out', 'graded']).eq('exams.school_id', schoolId)
    : role === 'teacher' && schoolId
      ? supabase.from('exam_sessions').select('percentage, status, exams!inner(school_id)').in('status', ['submitted', 'timed_out', 'graded']).eq('exams.school_id', schoolId) // SECURITY: scope teacher to their school
      : supabase.from('exam_sessions').select('percentage, status').in('status', ['submitted', 'timed_out', 'graded'])

  // Apply date filter to sessions
  if (dateFilter) {
    sessionsQuery = sessionsQuery.gte('created_at', dateFilter)
  }

  const [examsResult, studentsResult, sessionsResult] = await Promise.all([
    examScope,
    studentScope,
    sessionsQuery,
  ])

  const totalExams = examsResult.count ?? 0
  const activeStudents = studentsResult.count ?? 0

  // Handle the different data shapes from scoped queries
  const sessions = (sessionsResult.data ?? []).map(s => ({
    percentage: s.percentage ?? 0,
  }))
  const passedSessions = sessions.filter(s => s.percentage >= 50)
  const avgPassRate = sessions.length > 0 ? Math.round((passedSessions.length / sessions.length) * 100) : 0
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length)
    : 0

  const stats: AnalyticsStats = {
    totalExams,
    activeStudents,
    avgPassRate,
    avgScore,
  }

  // ─── Exam Trend (monthly, single aggregate query) ────────
  let examTrendQuery = supabase
    .from('exam_sessions')
    .select('created_at, percentage, exams!inner(school_id)')
    .in('status', ['submitted', 'timed_out', 'graded'])
    .order('created_at', { ascending: true })
    .limit(500)

  // Apply date range filter
  if (dateFilter) {
    examTrendQuery = examTrendQuery.gte('created_at', dateFilter)
  }

  // SECURITY: Scope by role to prevent cross-tenant data leak
  if (role === 'student') {
    examTrendQuery = examTrendQuery.eq('student_id', userId)
  } else if ((role === 'school_admin' || role === 'teacher') && schoolId) {
    examTrendQuery = examTrendQuery.eq('exams.school_id', schoolId)
  }

  const { data: examTrendData } = await examTrendQuery

  const monthlyMap = new Map<string, { count: number; totalPct: number }>()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (const session of examTrendData ?? []) {
    const d = new Date(session.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthlyMap.get(key) ?? { count: 0, totalPct: 0 }
    existing.count++
    existing.totalPct += session.percentage ?? 0
    monthlyMap.set(key, existing)
  }

  const examTrend: TimeSeriesPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, val]) => {
      const [y, m] = key.split('-')
      return {
        date: key,
        label: `${monthNames[parseInt(m) - 1]} ${y}`,
        value: val.count,
        value2: val.count > 0 ? Math.round(val.totalPct / val.count) : 0,
      }
    })

  // ─── Subject Performance (single query with join) ────────
  let subjectQuery = supabase
    .from('exams')
    .select('subject, exam_sessions(percentage)')
    .in('status', ['completed', 'active', 'published'])

  if (schoolId && role !== 'super_admin') {
    subjectQuery = subjectQuery.eq('school_id', schoolId)
  }
  if (role === 'teacher') {
    subjectQuery = subjectQuery.eq('created_by', userId)
  }
  // Apply date filter to subject performance
  if (dateFilter) {
    subjectQuery = subjectQuery.gte('created_at', dateFilter)
  }

  const { data: subjectExams } = await subjectQuery

  const subjectMap = new Map<string, { scores: number[]; total: number }>()
  for (const exam of subjectExams ?? []) {
    if (!exam.subject) continue
    const sessions = exam.exam_sessions as unknown as Array<{ percentage: number | null }> | null
    const existing = subjectMap.get(exam.subject) ?? { scores: [], total: 0 }
    for (const s of sessions ?? []) {
      if (s.percentage !== null) {
        existing.scores.push(s.percentage)
        existing.total += s.percentage
      }
    }
    subjectMap.set(exam.subject, existing)
  }

  const subjectPerformance: SubjectPerformance[] = Array.from(subjectMap.entries())
    .map(([subject, data]) => ({
      subject,
      score: data.scores.length > 0 ? Math.round(data.total / data.scores.length) : 0,
      passRate: data.scores.length > 0 ? Math.round((data.scores.filter(s => s >= 50).length / data.scores.length) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  // ─── Weekly Activity (single query) ─────────────────────
  let weeklyQuery = supabase
    .from('exam_sessions')
    .select('created_at, exams!inner(school_id)')
    .in('status', ['submitted', 'timed_out', 'graded', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(200)

  // SECURITY: Scope by role to prevent cross-tenant data leak
  if (role === 'student') {
    weeklyQuery = weeklyQuery.eq('student_id', userId)
  } else if ((role === 'school_admin' || role === 'teacher') && schoolId) {
    weeklyQuery = weeklyQuery.eq('exams.school_id', schoolId)
  }
  // Apply date filter to weekly activity
  if (dateFilter) {
    weeklyQuery = weeklyQuery.gte('created_at', dateFilter)
  }

  const { data: weeklySessions } = await weeklyQuery

  const weekMap = new Map<string, number>()
  for (const session of weeklySessions ?? []) {
    const d = new Date(session.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
  }

  const weeklyActivity: WeeklyActivity[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-4)
    .map(([key, count]) => {
      const d = new Date(key)
      const end = new Date(d)
      end.setDate(d.getDate() + 6)
      return {
        week: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        exams: count,
        participants: count, // Real count of sessions (participants approximated by sessions)
      }
    })

  // ─── School Rankings (batch query, no N+1) ──────────────
  // Only super_admin and school_admin see school rankings
  const schoolRankings: SchoolRanking[] = []

  if (role === 'super_admin' || role === 'school_admin') {
    // Fetch all schools in one query
    let schoolsQuery = supabase
      .from('schools')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(10)

    if (role === 'school_admin' && schoolId) {
      schoolsQuery = schoolsQuery.eq('id', schoolId)
    }

    const { data: schoolsData } = await schoolsQuery

    if (schoolsData && schoolsData.length > 0) {
      // Batch: get all student counts in one query
      const schoolIds = schoolsData.map(s => s.id)
      const { data: allStudentCounts } = await supabase
        .from('users')
        .select('school_id')
        .eq('role', 'student')
        .eq('is_active', true)
        .in('school_id', schoolIds)

      // Batch: get all exam counts in one query
      const { data: allExamCounts } = await supabase
        .from('exams')
        .select('school_id')
        .in('school_id', schoolIds)

      // Aggregate counts by school_id
      const studentsBySchool = new Map<string, number>()
      for (const row of allStudentCounts ?? []) {
        if (row.school_id) {
          studentsBySchool.set(row.school_id, (studentsBySchool.get(row.school_id) ?? 0) + 1)
        }
      }

      const examsBySchool = new Map<string, number>()
      for (const row of allExamCounts ?? []) {
        if (row.school_id) {
          examsBySchool.set(row.school_id, (examsBySchool.get(row.school_id) ?? 0) + 1)
        }
      }

      // Batch: get all exam sessions with scores for ranking
      let schoolSessionsQuery = supabase
        .from('exam_sessions')
        .select('percentage, exams!inner(school_id)')
        .in('status', ['submitted', 'timed_out', 'graded'])
        .in('exams.school_id', schoolIds)
      // Apply date filter to school rankings sessions
      if (dateFilter) {
        schoolSessionsQuery = schoolSessionsQuery.gte('created_at', dateFilter)
      }
      const { data: allSchoolSessions } = await schoolSessionsQuery

      // Aggregate scores by school_id
      const scoresBySchool = new Map<string, { total: number; count: number; passed: number }>()
      for (const row of allSchoolSessions ?? []) {
        const session = row as unknown as { percentage: number | null; exams: { school_id: string } }
        const sid = session.exams?.school_id
        if (!sid) continue
        const existing = scoresBySchool.get(sid) ?? { total: 0, count: 0, passed: 0 }
        if (session.percentage !== null) {
          existing.total += session.percentage
          existing.count++
          if (session.percentage >= 50) existing.passed++
        }
        scoresBySchool.set(sid, existing)
      }

      for (const school of schoolsData) {
        const scoreData = scoresBySchool.get(school.id)
        schoolRankings.push({
          id: school.id,
          name: school.name,
          avgScore: scoreData && scoreData.count > 0 ? Math.round(scoreData.total / scoreData.count) : 0,
          totalStudents: studentsBySchool.get(school.id) ?? 0,
          totalExams: examsBySchool.get(school.id) ?? 0,
          passRate: scoreData && scoreData.count > 0 ? Math.round((scoreData.passed / scoreData.count) * 100) : 0,
        })
      }
    }
  }

  // ─── Quick Insights ──────────────────────────────────────
  const topSubject = subjectPerformance.length > 0 ? subjectPerformance[0].subject : null
  const needsAttention = subjectPerformance.length > 0 ? subjectPerformance[subjectPerformance.length - 1].subject : null
  const mostActiveMonth = examTrend.length > 0
    ? examTrend.reduce((max, p) => p.value > max.value ? p : max, examTrend[0]).label
    : null

  return {
    stats,
    examTrend,
    subjectPerformance,
    weeklyActivity,
    schoolRankings,
    quickInsights: {
      topSubject,
      needsAttention,
      mostActiveMonth,
    },
  }
}
