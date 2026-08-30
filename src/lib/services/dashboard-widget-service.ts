// ============================================================================
// ExamForge AI — Dashboard Widget Data Service (UX 2.0)
// ============================================================================
// Real-data feeds for dashboard widgets: score trends, upcoming exams,
// calendar events, revenue trends, score distribution, subject performance.
// All queries are scoped by role/school/user to prevent data leakage.
// NO fake data — every widget renders live database aggregates, and shows
// honest empty states when there is nothing to aggregate yet.
// ============================================================================

import { requireSupabase } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ScoreTrendPoint {
  date: string
  score: number
  label: string
}

export interface SubjectPerformance {
  subject: string
  score: number
  count: number
}

export interface UpcomingExamItem {
  id: string
  title: string
  start_time: string | null
  end_time: string | null
  status: string
}

export interface CalendarEventItem {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  is_full_day: boolean | null
}

export interface RevenueTrendPoint {
  date: string
  revenue: number
}

export interface ScoreDistributionBucket {
  bucket: string
  count: number
}

export interface ExamPerformanceItem {
  exam: string
  avgScore: number
  sessions: number
}

// ──────────────────────────────────────────────────────────────
// Student widgets
// ──────────────────────────────────────────────────────────────

/** Score-over-time trend from the student's own graded sessions (area chart). */
export async function getStudentScoreTrend(userId: string): Promise<ScoreTrendPoint[]> {
  const supabase = await requireSupabase()

  const { data } = await supabase
    .from('exam_sessions')
    .select('id, percentage, created_at, exams(title)')
    .eq('student_id', userId)
    .in('status', ['submitted', 'timed_out', 'graded'])
    .not('percentage', 'is', null)
    .order('created_at', { ascending: true })
    .limit(12)

  type TrendRow = {
    id: string
    percentage: number | null
    created_at: string
    exams: { title: string | null } | { title: string | null }[] | null
  }

  return ((data ?? []) as unknown as TrendRow[]).map((row) => ({
    date: row.created_at,
    score: Math.round(row.percentage ?? 0),
    label: Array.isArray(row.exams) ? (row.exams[0]?.title ?? 'Exam') : (row.exams?.title ?? 'Exam'),
  }))
}

/** Per-subject average score from the student's graded sessions (bar chart). */
export async function getStudentSubjectPerformance(userId: string): Promise<SubjectPerformance[]> {
  const supabase = await requireSupabase()

  const { data } = await supabase
    .from('exam_sessions')
    .select('percentage, exams(title, subject_id, subjects(name))')
    .eq('student_id', userId)
    .in('status', ['submitted', 'timed_out', 'graded'])
    .not('percentage', 'is', null)
    .limit(100)

  type Row = {
    percentage: number | null
    exams:
      | {
          title: string | null
          subject_id: string | null
          subjects: { name: string | null } | { name: string | null }[] | null
        }
      | { title: string | null; subject_id: string | null; subjects: { name: string | null } | { name: string | null }[] | null }[]
      | null
  }

  const bySubject = new Map<string, { total: number; count: number }>()
  for (const row of (data ?? []) as unknown as Row[]) {
    const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
    const subject =
      (Array.isArray(exam?.subjects) ? exam?.subjects[0]?.name : exam?.subjects?.name) ??
      exam?.title ??
      'General'
    const entry = bySubject.get(subject) ?? { total: 0, count: 0 }
    entry.total += row.percentage ?? 0
    entry.count += 1
    bySubject.set(subject, entry)
  }

  return Array.from(bySubject.entries())
    .map(([subject, { total, count }]) => ({
      subject,
      score: Math.round(total / Math.max(count, 1)),
      count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

/** Upcoming (not-yet-taken) exams for the student — feeds Tasks + Calendar. */
export async function getStudentUpcomingExams(
  userId: string,
  schoolId: string | null
): Promise<UpcomingExamItem[]> {
  const supabase = await requireSupabase()

  const { data: taken } = await supabase
    .from('exam_sessions')
    .select('exam_id')
    .eq('student_id', userId)
    .limit(100)
  const takenIds = new Set((taken ?? []).map((s: { exam_id: string }) => s.exam_id))

  let query = supabase
    .from('exams')
    .select('id, title, start_time, end_time, status')
    .in('status', ['published', 'active'])
    .order('start_time', { ascending: true, nullsFirst: false })
    .limit(15)

  // SECURITY: scope to the student's school to prevent cross-tenant leakage
  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data } = await query

  return (data ?? [])
    .filter((exam: UpcomingExamItem) => !takenIds.has(exam.id))
    .slice(0, 6)
}

// ──────────────────────────────────────────────────────────────
// Teacher widgets
// ──────────────────────────────────────────────────────────────

/** Average score per exam for the teacher's own exams (bar chart). */
export async function getTeacherExamPerformance(
  userId: string,
  limit = 6
): Promise<ExamPerformanceItem[]> {
  const supabase = await requireSupabase()

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!exams || exams.length === 0) return []

  const examIds = exams.map((e: { id: string }) => e.id)
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('exam_id, percentage')
    .in('exam_id', examIds)
    .not('percentage', 'is', null)
    .limit(500)

  type SessionRow = { exam_id: string; percentage: number | null }
  const byExam = new Map<string, { total: number; count: number }>()
  for (const s of (sessions ?? []) as SessionRow[]) {
    const entry = byExam.get(s.exam_id) ?? { total: 0, count: 0 }
    entry.total += s.percentage ?? 0
    entry.count += 1
    byExam.set(s.exam_id, entry)
  }

  return exams
    .map((exam: { id: string; title: string }) => {
      const agg = byExam.get(exam.id) ?? { total: 0, count: 0 }
      return {
        exam: exam.title.length > 24 ? `${exam.title.slice(0, 24)}…` : exam.title,
        avgScore: agg.count > 0 ? Math.round(agg.total / agg.count) : 0,
        sessions: agg.count,
      }
    })
    .filter((item: ExamPerformanceItem) => item.sessions > 0)
}

/** The teacher's upcoming / running exams — feeds Tasks + Calendar. */
export async function getTeacherUpcomingExams(userId: string): Promise<UpcomingExamItem[]> {
  const supabase = await requireSupabase()

  const { data } = await supabase
    .from('exams')
    .select('id, title, start_time, end_time, status')
    .eq('created_by', userId)
    .in('status', ['published', 'active'])
    .order('start_time', { ascending: true, nullsFirst: false })
    .limit(6)

  return data ?? []
}

// ──────────────────────────────────────────────────────────────
// Admin widgets (school + super)
// ──────────────────────────────────────────────────────────────

/** Successful transaction revenue grouped by day (last 30 days) — line/area chart. */
export async function getRevenueTrend(schoolId?: string): Promise<RevenueTrendPoint[]> {
  const supabase = await requireSupabase()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('status', 'successful')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data } = await query

  type TxRow = { amount: number; created_at: string }
  const byDay = new Map<string, number>()
  for (const tx of (data ?? []) as TxRow[]) {
    const day = tx.created_at.slice(0, 10) // YYYY-MM-DD
    byDay.set(day, (byDay.get(day) ?? 0) + tx.amount)
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({
      date: date.slice(5), // MM-DD
      revenue,
    }))
}

/** Score distribution buckets across a school's sessions (column chart). */
export async function getScoreDistribution(
  schoolId: string | null
): Promise<ScoreDistributionBucket[]> {
  const supabase = await requireSupabase()

  let query = supabase
    .from('exam_sessions')
    .select('percentage, exams!inner(school_id)')
    .in('status', ['submitted', 'timed_out', 'graded'])
    .not('percentage', 'is', null)
    .limit(1000)

  if (schoolId) {
    query = query.eq('exams.school_id', schoolId)
  }

  const { data } = await query

  const buckets: ScoreDistributionBucket[] = [
    { bucket: '0-39', count: 0 },
    { bucket: '40-59', count: 0 },
    { bucket: '60-69', count: 0 },
    { bucket: '70-84', count: 0 },
    { bucket: '85-100', count: 0 },
  ]
  const ranges: Array<[number, number]> = [
    [0, 39],
    [40, 59],
    [60, 69],
    [70, 84],
    [85, 100],
  ]

  for (const row of (data ?? []) as Array<{ percentage: number | null }>) {
    const score = row.percentage ?? 0
    for (let i = 0; i < ranges.length; i++) {
      if (score >= ranges[i][0] && score <= ranges[i][1]) {
        buckets[i].count += 1
        break
      }
    }
  }

  return buckets
}

/** New user signups per day for the last 14 days (super admin growth chart). */
export async function getUserGrowthTrend(schoolId?: string): Promise<RevenueTrendPoint[]> {
  const supabase = await requireSupabase()

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('users')
    .select('created_at')
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data } = await query

  const byDay = new Map<string, number>()
  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const day = row.created_at.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), revenue: count }))
}

// ──────────────────────────────────────────────────────────────
// Shared widgets
// ──────────────────────────────────────────────────────────────

/** Upcoming school calendar events — feeds Calendar + Announcements widgets. */
export async function getUpcomingSchoolEvents(
  schoolId: string | null,
  limit = 6
): Promise<CalendarEventItem[]> {
  const supabase = await requireSupabase()

  if (!schoolId) return []

  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('school_calendar_events')
    .select('id, title, event_type, start_date, end_date, is_full_day')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(limit)

  return data ?? []
}
