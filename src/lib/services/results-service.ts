// ============================================================================
// ExamForge AI — Results Data Service
// ============================================================================
// Server-side data fetching for exam results, grades, and analytics.
// All queries are scoped by role and school_id to prevent data leakage.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'
import { devDashboardStats } from '@/lib/supabase/dev-adapter'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ResultListItem {
  id: string
  studentName: string
  studentEmail: string
  studentAvatarUrl: string | null
  examTitle: string
  subject: string | null
  className: string | null
  score: number
  totalMarks: number
  percentage: number
  timeTaken: number | null
  status: 'passed' | 'failed' | 'absent'
  submittedAt: string | null
}

export interface ResultsStats {
  passRate: number
  averageScore: number
  highestScore: number
  totalSubmissions: number
  passedCount: number
  failedCount: number
  absentCount: number
}

export interface ResultsPageData {
  stats: ResultsStats
  results: ResultListItem[]
}

// ──────────────────────────────────────────────────────────────
// Results Service (scoped by role)
// ──────────────────────────────────────────────────────────────

export async function getResultsData(
  role: string,
  userId: string,
  schoolId: string | null
): Promise<ResultsPageData> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    return {
      stats: { passRate: 84, averageScore: 72, highestScore: 98, totalSubmissions: 156, passedCount: 131, failedCount: 25, absentCount: 0 },
      results: [],
    }
  }

  // Build exam sessions query with role-based scoping
  let sessionQuery = supabase
    .from('exam_sessions')
    .select(`
      id,
      student_id,
      exam_id,
      total_score,
      max_score,
      percentage,
      time_taken_seconds,
      status,
      submitted_at,
      created_at
    `)
    .in('status', ['submitted', 'timed_out', 'graded'])
    .order('submitted_at', { ascending: false })

  // Scope by role
  if (role === 'student') {
    // Students can only see their own results
    sessionQuery = sessionQuery.eq('student_id', userId)
  } else if (role === 'teacher' && schoolId) {
    // Teachers can only see results for exams in their school
    sessionQuery = sessionQuery.eq('exams.school_id', schoolId)
  } else if (role === 'school_admin' && schoolId) {
    // School admins can only see results for their school
    sessionQuery = sessionQuery.eq('exams.school_id', schoolId)
  }
  // super_admin sees all (no filter)

  const { data: sessions, error: sessionsError } = await sessionQuery.limit(100)

  if (sessionsError) {
    return {
      stats: { passRate: 0, averageScore: 0, highestScore: 0, totalSubmissions: 0, passedCount: 0, failedCount: 0, absentCount: 0 },
      results: [],
    }
  }

  // Get student profiles and exam details (batch queries)
  const studentIds = [...new Set((sessions ?? []).map(s => s.student_id))]
  const examIds = [...new Set((sessions ?? []).map(s => s.exam_id))]

  const [studentsResult, examsResult] = await Promise.all([
    supabase.from('users').select('id, full_name, email, avatar_url').in('id', studentIds.length > 0 ? studentIds : ['__none__']),
    supabase.from('exams').select('id, title, subject, class_id').in('id', examIds.length > 0 ? examIds : ['__none__']),
  ])

  // Build lookup maps
  const studentMap = new Map<string, { name: string; email: string; avatarUrl: string | null }>()
  for (const s of studentsResult.data ?? []) {
    studentMap.set(s.id, {
      name: s.full_name ?? s.email?.split('@')[0] ?? 'Unknown',
      email: s.email ?? '',
      avatarUrl: s.avatar_url,
    })
  }

  const examMap = new Map<string, { title: string; subject: string | null; classId: string | null }>()
  for (const e of examsResult.data ?? []) {
    examMap.set(e.id, { title: e.title, subject: e.subject, classId: e.class_id })
  }

  // Get class names
  const classIds = [...new Set(Array.from(examMap.values()).map(e => e.classId).filter(Boolean))] as string[]
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds.length > 0 ? classIds : ['__none__'])

  const classMap = new Map<string, string>()
  for (const c of classesData ?? []) {
    classMap.set(c.id, c.name)
  }

  // Map results
  const results: ResultListItem[] = (sessions ?? []).map(session => {
    const student = studentMap.get(session.student_id) ?? { name: 'Unknown', email: '', avatarUrl: null }
    const exam = examMap.get(session.exam_id) ?? { title: 'Unknown Exam', subject: null, classId: null }
    const percentage = session.percentage ?? 0
    const status: 'passed' | 'failed' | 'absent' = percentage >= 50 ? 'passed' : 'failed'

    return {
      id: session.id,
      studentName: student.name,
      studentEmail: student.email,
      studentAvatarUrl: student.avatarUrl,
      examTitle: exam.title,
      subject: exam.subject,
      className: exam.classId ? (classMap.get(exam.classId) ?? null) : null,
      score: session.total_score ?? 0,
      totalMarks: session.max_score ?? 0,
      percentage,
      timeTaken: session.time_taken_seconds,
      status,
      submittedAt: session.submitted_at,
    }
  })

  // Calculate stats
  const totalSubmissions = results.length
  const passedCount = results.filter(r => r.status === 'passed').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0
  const averageScore = totalSubmissions > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalSubmissions)
    : 0
  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0

  return {
    stats: { passRate, averageScore, highestScore, totalSubmissions, passedCount, failedCount, absentCount: 0 },
    results,
  }
}
