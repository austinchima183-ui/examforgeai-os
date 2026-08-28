// ============================================================================
// ExamForge AI — Dashboard Data Service
// ============================================================================
// Server-side data fetching for role-specific dashboards.
// All queries are scoped by role and school_id to prevent data leakage.
// N+1 queries have been replaced with aggregate queries.
// ============================================================================

import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode, devDashboardStats } from '@/lib/supabase/dev-adapter'
import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface SuperAdminStats {
  schools: number
  users: number
  revenue: number
  exams: number
  activeSchools: number
  pendingPayments: number
}

export interface SchoolAdminStats {
  teachers: number
  students: number
  exams: number
  revenue: number
  activeClasses: number
  pendingSubmissions: number
}

export interface TeacherStats {
  classes: number
  students: number
  exams: number
  questions: number
  pendingGrading: number
  activeExams: number
}

export interface StudentStats {
  upcomingExams: number
  completed: number
  averageScore: number
  totalExams: number
  practiceSessions: number
}

export interface ActivityItem {
  id: string
  description: string
  timestamp: string
  type: string
}

// ──────────────────────────────────────────────────────────────
// Super Admin Dashboard
// ──────────────────────────────────────────────────────────────

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      schools: 12,
      users: devDashboardStats.totalStudents + devDashboardStats.totalTeachers,
      revenue: 2450000,
      exams: devDashboardStats.totalExams,
      activeSchools: 10,
      pendingPayments: 3,
    }
  }

  const [schoolsResult, usersResult, examsResult, paymentsResult] = await Promise.all([
    supabase.from('schools').select('id, is_active', { count: 'exact', head: false }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('exams').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('amount').eq('status', 'successful'),
  ])

  const schools = schoolsResult.data ?? []
  const activeSchools = schools.filter(s => s.is_active).length
  const revenue = (paymentsResult.data ?? []).reduce((sum, p) => sum + p.amount, 0)

  const pendingPaymentsResult = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return {
    schools: schoolsResult.count ?? 0,
    users: usersResult.count ?? 0,
    revenue,
    exams: examsResult.count ?? 0,
    activeSchools,
    pendingPayments: pendingPaymentsResult.count ?? 0,
  }
}

export async function getSuperAdminActivities(): Promise<ActivityItem[]> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    const now = new Date().toISOString()
    return [
      { id: 'dev-act-1', description: 'New school registered: Development Academy', timestamp: now, type: 'school' },
      { id: 'dev-act-2', description: 'Payment received: NGN 149,000', timestamp: now, type: 'revenue' },
      { id: 'dev-act-3', description: 'New teacher joined: Mrs. Adeyemi', timestamp: now, type: 'user' },
    ]
  }

  const [recentSchools, recentPayments, recentUsers] = await Promise.all([
    supabase.from('schools').select('id, name, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('transactions').select('id, amount, currency, created_at, status').eq('status', 'successful').order('created_at', { ascending: false }).limit(3),
    supabase.from('users').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(3),
  ])

  const activities: ActivityItem[] = []

  for (const school of recentSchools.data ?? []) {
    activities.push({ id: `school-${school.id}`, description: `New school registered: ${school.name}`, timestamp: school.created_at, type: 'school' })
  }
  for (const payment of recentPayments.data ?? []) {
    activities.push({ id: `payment-${payment.id}`, description: `Payment received: ${payment.currency?.toUpperCase() ?? 'NGN'} ${payment.amount.toLocaleString()}`, timestamp: payment.created_at, type: 'revenue' })
  }
  for (const user of recentUsers.data ?? []) {
    activities.push({ id: `user-${user.id}`, description: `New ${user.role} joined: ${user.full_name ?? 'Unknown'}`, timestamp: user.created_at, type: 'user' })
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return activities.slice(0, 10)
}

// ──────────────────────────────────────────────────────────────
// School Admin Dashboard (scoped by schoolId)
// ──────────────────────────────────────────────────────────────

export async function getSchoolAdminStats(schoolId: string): Promise<SchoolAdminStats> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      teachers: devDashboardStats.totalTeachers,
      students: devDashboardStats.totalStudents,
      exams: devDashboardStats.totalExams,
      revenue: 750000,
      activeClasses: 4,
      pendingSubmissions: devDashboardStats.pendingSubmissions,
    }
  }

  const [teachersResult, studentsResult, examsResult, paymentsResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher').eq('is_active', true),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student').eq('is_active', true),
    supabase.from('exams').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('transactions').select('amount').eq('school_id', schoolId).eq('status', 'successful'),
  ])

  const revenue = (paymentsResult.data ?? []).reduce((sum, p) => sum + p.amount, 0)

  // Scope pending submissions to this school's exams
  const pendingSubmissionsResult = await supabase
    .from('exam_sessions')
    .select('id, exams!inner(school_id)')
    .eq('status', 'submitted')
    .eq('exams.school_id', schoolId)

  return {
    teachers: teachersResult.count ?? 0,
    students: studentsResult.count ?? 0,
    exams: examsResult.count ?? 0,
    revenue,
    activeClasses: 0,
    pendingSubmissions: pendingSubmissionsResult.data?.length ?? 0,
  }
}

export async function getSchoolAdminActivities(schoolId: string): Promise<ActivityItem[]> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    const now = new Date().toISOString()
    return [
      { id: 'dev-act-4', description: 'Exam "SS1 Mathematics Mid-Term" status changed to active', timestamp: now, type: 'exam' },
      { id: 'dev-act-5', description: 'New teacher joined: Mrs. Adeyemi', timestamp: now, type: 'teacher' },
      { id: 'dev-act-6', description: 'New student joined: Adebayo Ogun', timestamp: now, type: 'student' },
    ]
  }

  const [recentExams, recentUsers] = await Promise.all([
    supabase.from('exams').select('id, title, status, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('users').select('id, full_name, role, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
  ])

  const activities: ActivityItem[] = []

  for (const exam of recentExams.data ?? []) {
    activities.push({ id: `exam-${exam.id}`, description: `Exam "${exam.title}" status changed to ${exam.status}`, timestamp: exam.created_at, type: 'exam' })
  }
  for (const user of recentUsers.data ?? []) {
    activities.push({ id: `user-${user.id}`, description: `New ${user.role} joined: ${user.full_name ?? 'Unknown'}`, timestamp: user.created_at, type: user.role === 'teacher' ? 'teacher' : 'student' })
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return activities.slice(0, 10)
}

// ──────────────────────────────────────────────────────────────
// Teacher Dashboard (scoped by userId)
// ──────────────────────────────────────────────────────────────

export async function getTeacherStats(userId: string): Promise<TeacherStats> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      classes: 4,
      students: 125,
      exams: 8,
      questions: 240,
      pendingGrading: 5,
      activeExams: 2,
    }
  }

  // Get teacher's exam IDs first
  const { data: teacherExams } = await supabase
    .from('exams')
    .select('id')
    .eq('created_by', userId)

  const teacherExamIds = (teacherExams ?? []).map(e => e.id)

  // Parallel queries for all stats
  const [examsResult, questionsResult, activeExamsResult, pendingGradingResult, sessionsResult] = await Promise.all([
    supabase.from('exams').select('id', { count: 'exact', head: true }).eq('created_by', userId),
    // questions have no created_by column — scope via the teacher's exam IDs
    teacherExamIds.length > 0
      ? supabase.from('questions').select('id', { count: 'exact', head: true }).in('exam_id', teacherExamIds)
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase.from('exams').select('id', { count: 'exact', head: true }).eq('created_by', userId).eq('status', 'active'),
    teacherExamIds.length > 0
      ? supabase.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('status', 'submitted').in('exam_id', teacherExamIds)
      : Promise.resolve({ count: 0, data: null, error: null }),
    teacherExamIds.length > 0
      ? supabase.from('exam_sessions').select('student_id').in('exam_id', teacherExamIds)
      : Promise.resolve({ count: 0, data: [], error: null }),
  ])

  // Count unique students from teacher's exam sessions
  const uniqueStudents = new Set((sessionsResult.data ?? []).map(s => s.student_id))

  return {
    classes: 0,
    students: uniqueStudents.size,
    exams: examsResult.count ?? 0,
    questions: questionsResult.count ?? 0,
    pendingGrading: pendingGradingResult.count ?? 0,
    activeExams: activeExamsResult.count ?? 0,
  }
}

export async function getTeacherActivities(userId: string): Promise<ActivityItem[]> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    const now = new Date().toISOString()
    return [
      { id: 'dev-act-7', description: 'Exam "SS1 Mathematics Mid-Term" — active', timestamp: now, type: 'exam' },
      { id: 'dev-act-8', description: 'AI-generated single_choice question', timestamp: now, type: 'question' },
    ]
  }

  const [recentExams, recentQuestions] = await Promise.all([
    supabase.from('exams').select('id, title, status, created_at').eq('created_by', userId).order('created_at', { ascending: false }).limit(5),
    // questions have no created_by column — scope via the teacher's exam IDs
    (async () => {
      const { data: teacherExamIds } = await supabase.from('exams').select('id').eq('created_by', userId)
      const ids = (teacherExamIds ?? []).map(e => e.id)
      if (ids.length === 0) return { data: [] as Array<{ id: string; question_type: string; created_at: string }> }
      return supabase.from('questions').select('id, question_type, created_at').in('exam_id', ids).order('created_at', { ascending: false }).limit(3)
    })(),
  ])

  const activities: ActivityItem[] = []

  for (const exam of recentExams.data ?? []) {
    activities.push({ id: `exam-${exam.id}`, description: `Exam "${exam.title}" — ${exam.status}`, timestamp: exam.created_at, type: 'exam' })
  }
  for (const question of recentQuestions.data ?? []) {
    activities.push({ id: `question-${question.id}`, description: `Created ${question.question_type} question`, timestamp: question.created_at, type: 'question' })
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return activities.slice(0, 10)
}

// ──────────────────────────────────────────────────────────────
// Student Dashboard (scoped by userId — own data only)
// ──────────────────────────────────────────────────────────────

export async function getStudentStats(userId: string, schoolId: string | null): Promise<StudentStats> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      upcomingExams: 3,
      completed: 12,
      averageScore: 72,
      totalExams: 12,
      practiceSessions: 5,
    }
  }

  // Get completed sessions (only student's own)
  const { data: completedSessions } = await supabase
    .from('exam_sessions')
    .select('id, percentage, total_score, max_score')
    .eq('student_id', userId)
    .in('status', ['submitted', 'timed_out', 'graded'])
    .limit(50)

  const completed = completedSessions?.length ?? 0
  const scoresWithPercentage = completedSessions?.filter(s => s.percentage !== null) ?? []
  const averageScore = scoresWithPercentage.length > 0
    ? Math.round(scoresWithPercentage.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / scoresWithPercentage.length)
    : 0

  // Get upcoming exams (only exams the student hasn't taken yet)
  const { data: takenExamIds } = await supabase
    .from('exam_sessions')
    .select('exam_id')
    .eq('student_id', userId)
    .limit(50)

  const takenIds = new Set(takenExamIds?.map(s => s.exam_id) ?? [])

  // SECURITY: Scope upcoming exams to student's school to prevent cross-tenant data leak
  let upcomingQuery = supabase
    .from('exams')
    .select('id')
    .in('status', ['published', 'active'])
    .limit(20)

  if (schoolId) {
    upcomingQuery = upcomingQuery.eq('school_id', schoolId)
  }
  const { data: upcomingExams } = await upcomingQuery

  const upcomingExamsCount = (upcomingExams ?? []).filter(e => !takenIds.has(e.id)).length

  return {
    upcomingExams: upcomingExamsCount,
    completed,
    averageScore,
    totalExams: completed,
    practiceSessions: 0,
  }
}

export async function getStudentActivities(userId: string): Promise<ActivityItem[]> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    const now = new Date().toISOString()
    return [
      { id: 'dev-act-9', description: 'Completed "SS1 Mathematics Mid-Term" — scored 68%', timestamp: now, type: 'result' },
      { id: 'dev-act-10', description: 'Started "SS2 English Final"', timestamp: now, type: 'exam' },
    ]
  }

  const { data: recentSessions } = await supabase
    .from('exam_sessions')
    .select('id, exam_id, status, percentage, created_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get exam titles
  const examIds = [...new Set(recentSessions?.map(s => s.exam_id) ?? [])]
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title')
    .in('id', examIds)

  const examMap = new Map(exams?.map(e => [e.id, e.title]) ?? [])

  const activities: ActivityItem[] = (recentSessions ?? []).map(session => {
    const examTitle = examMap.get(session.exam_id) ?? 'Unknown Exam'
    let description = ''
    let type = 'exam'

    if (session.status === 'submitted' || session.status === 'graded') {
      description = `Completed "${examTitle}" — scored ${session.percentage ?? 0}%`
      type = 'result'
    } else if (session.status === 'in_progress') {
      description = `Started "${examTitle}"`
      type = 'exam'
    } else {
      description = `${session.status} — "${examTitle}"`
      type = 'exam'
    }

    return { id: `session-${session.id}`, description, timestamp: session.created_at, type }
  })

  return activities.slice(0, 10)
}

// ──────────────────────────────────────────────────────────────
// Role-based Dashboard Router
// ──────────────────────────────────────────────────────────────

export async function getDashboardData(role: UserRole, userId: string, schoolId: string | null) {
  switch (role) {
    case 'super_admin':
      return {
        stats: await getSuperAdminStats(),
        activities: await getSuperAdminActivities(),
      }
    case 'school_admin':
      if (!schoolId) {
        return { stats: null, activities: [] }
      }
      return {
        stats: await getSchoolAdminStats(schoolId),
        activities: await getSchoolAdminActivities(schoolId),
      }
    case 'teacher':
      return {
        stats: await getTeacherStats(userId),
        activities: await getTeacherActivities(userId),
      }
    case 'student':
      return {
        stats: await getStudentStats(userId, schoolId),
        activities: await getStudentActivities(userId),
      }
    default:
      return {
        stats: await getStudentStats(userId, schoolId),
        activities: await getStudentActivities(userId),
      }
  }
}
