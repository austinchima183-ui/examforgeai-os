// ============================================================================
// ExamForge AI — CBT / Exams Data Service
// ============================================================================
// Server-side data fetching for CBT (Computer-Based Testing) module.
// All queries use the Supabase server client with cookie-based auth.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import { isDevAdapterMode, devExams } from '@/lib/supabase/dev-adapter'
import type { ExamStatus } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ExamListItem {
  id: string
  title: string
  subject: string | null
  className: string | null
  duration: number
  totalQuestions: number
  totalMarks: number
  participants: number
  completedCount: number
  status: string
  scheduledAt: string | null
  createdAt: string
}

export interface CBTStats {
  activeExams: number
  upcomingExams: number
  completedExams: number
  totalParticipants: number
}

export interface CBTPageData {
  stats: CBTStats
  exams: ExamListItem[]
}

// ──────────────────────────────────────────────────────────────
// CBT Service
// ──────────────────────────────────────────────────────────────

export async function getCBTData(
  role: string,
  userId: string,
  schoolId: string | null
): Promise<CBTPageData> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    const devExamList: ExamListItem[] = devExams.map(e => ({
      id: e.id,
      title: e.title,
      subject: e.subject,
      className: null,
      duration: e.duration_minutes,
      totalQuestions: e.question_count,
      totalMarks: e.question_count * 2,
      participants: e.total_submissions,
      completedCount: e.total_submissions,
      status: e.status,
      scheduledAt: null,
      createdAt: new Date().toISOString(),
    }))
    return {
      stats: {
        activeExams: devExamList.filter(e => e.status === 'active').length,
        upcomingExams: devExamList.filter(e => e.status === 'draft' || e.status === 'published').length,
        completedExams: devExamList.filter(e => e.status === 'completed').length,
        totalParticipants: devExamList.reduce((sum, e) => sum + e.participants, 0),
      },
      exams: devExamList,
    }
  }

  // Build query based on role
  let query = supabase
    .from('exams')
    .select(`
      id,
      title,
      subject_id,
      time_limit_minutes,
      total_marks,
      status,
      scheduled_at,
      created_at,
      class_id,
      created_by,
      school_id
    `)
    .order('created_at', { ascending: false })

  // Scope by school or creator
  if (role === 'school_admin' && schoolId) {
    query = query.eq('school_id', schoolId)
  } else if (role === 'teacher') {
    query = query.eq('created_by', userId)
  } else if (role === 'student' && schoolId) {
    // SECURITY: Students must only see exams from their own school
    query = query.eq('school_id', schoolId).in('status', ['published', 'active', 'completed'])
  } else if (role === 'student') {
    // Student without schoolId — only see published/active (RLS should enforce further)
    query = query.in('status', ['published', 'active', 'completed'])
  }
  // super_admin sees all (intentional)

  // SECURITY: Add pagination to prevent unbounded queries
  query = query.limit(100)

  const { data: exams, error } = await query

  if (error) {
    console.error('Error fetching exams:', error)
    return {
      stats: { activeExams: 0, upcomingExams: 0, completedExams: 0, totalParticipants: 0 },
      exams: [],
    }
  }

  // Get question counts and participant counts for each exam
  const examIds = (exams ?? []).map(e => e.id)

  const subjectIds = [...new Set((exams ?? []).filter(e => e.subject_id).map(e => e.subject_id!))]
  const [questionsResult, sessionsResult, classesResult, subjectsResult] = await Promise.all([
    supabase.from('questions').select('exam_id').in('exam_id', examIds.length > 0 ? examIds : ['__none__']),
    supabase.from('exam_sessions').select('exam_id, status').in('exam_id', examIds.length > 0 ? examIds : ['__none__']),
    supabase.from('classes').select('id, name').in('id', (exams ?? []).filter(e => e.class_id).map(e => e.class_id!)),
    supabase.from('subjects').select('id, name').in('id', subjectIds.length > 0 ? subjectIds : ['__none__']),
  ])

  // Build question count map
  const questionCountMap = new Map<string, number>()
  for (const q of questionsResult.data ?? []) {
    questionCountMap.set(q.exam_id, (questionCountMap.get(q.exam_id) ?? 0) + 1)
  }

  // Build participant/completed count map
  const participantMap = new Map<string, number>()
  const completedMap = new Map<string, number>()
  for (const s of sessionsResult.data ?? []) {
    participantMap.set(s.exam_id, (participantMap.get(s.exam_id) ?? 0) + 1)
    if (s.status === 'submitted' || s.status === 'graded' || s.status === 'timed_out') {
      completedMap.set(s.exam_id, (completedMap.get(s.exam_id) ?? 0) + 1)
    }
  }

  // Build class name map
  const classMap = new Map<string, string>()
  for (const c of classesResult.data ?? []) {
    classMap.set(c.id, c.name)
  }

  // Build subject name map
  const subjectMap = new Map<string, string>()
  for (const s of subjectsResult.data ?? []) {
    subjectMap.set(s.id, s.name)
  }

  // Map to list items
  const examList: ExamListItem[] = (exams ?? []).map(exam => ({
    id: exam.id,
    title: exam.title,
    subject: exam.subject_id ? (subjectMap.get(exam.subject_id) ?? null) : null,
    className: exam.class_id ? (classMap.get(exam.class_id) ?? null) : null,
    duration: exam.time_limit_minutes ?? 0,
    totalQuestions: questionCountMap.get(exam.id) ?? 0,
    totalMarks: exam.total_marks ?? 0,
    participants: participantMap.get(exam.id) ?? 0,
    completedCount: completedMap.get(exam.id) ?? 0,
    status: exam.status,
    scheduledAt: exam.scheduled_at,
    createdAt: exam.created_at,
  }))

  // Calculate stats
  const activeExams = examList.filter(e => e.status === 'active').length
  const upcomingExams = examList.filter(e => e.status === 'published' || e.status === 'draft').length
  const completedExams = examList.filter(e => e.status === 'completed').length
  const totalParticipants = examList.reduce((sum, e) => sum + e.participants, 0)

  return {
    stats: { activeExams, upcomingExams, completedExams, totalParticipants },
    exams: examList,
  }
}
