// ============================================================================
// ExamForge AI — Reports Data Service
// ============================================================================
// Server-side data fetching for report generation.
// All queries are scoped by role and school_id to prevent data leakage.
// N+1 queries have been replaced with aggregate queries.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import { devDashboardStats } from '@/lib/supabase/dev-adapter'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface SchoolReport {
  schoolId: string
  schoolName: string
  totalStudents: number
  totalTeachers: number
  totalExams: number
  avgScore: number
  passRate: number
  revenue: number
}

export interface TeacherReport {
  teacherId: string
  teacherName: string
  examsCreated: number
  questionsCreated: number
  avgStudentScore: number
  totalStudents: number
}

export interface StudentReport {
  studentId: string
  studentName: string
  email: string
  examsCompleted: number
  avgScore: number
  highestScore: number
  passRate: number
}

export interface RevenueReport {
  period: string
  totalRevenue: number
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  averagePayment: number
}

export interface ReportsData {
  schoolReports: SchoolReport[]
  teacherReports: TeacherReport[]
  studentReports: StudentReport[]
  revenueReport: RevenueReport
}

// ──────────────────────────────────────────────────────────────
// Reports Service
// ──────────────────────────────────────────────────────────────

export async function getReportsData(
  role: string,
  userId: string,
  schoolId: string | null,
  dateFrom?: string,
  dateTo?: string
): Promise<ReportsData> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    return {
      schoolReports: [],
      teacherReports: [],
      studentReports: [],
      revenueReport: {
        period: 'All time',
        totalRevenue: 0,
        totalPayments: 0,
        successfulPayments: 0,
        failedPayments: 0,
        averagePayment: 0,
      },
    }
  }

  // ─── School Reports (batch queries, no N+1) ──────────────
  let schoolQuery = supabase.from('schools').select('id, name').eq('is_active', true)
  if (schoolId && role !== 'super_admin') {
    schoolQuery = schoolQuery.eq('id', schoolId)
  }
  const { data: schools } = await schoolQuery.limit(50)

  const schoolReports: SchoolReport[] = []

  if (schools && schools.length > 0) {
    const schoolIds = schools.map(s => s.id)

    // Batch: get all student counts, teacher counts, exam counts, and payments
    const [studentsResult, teachersResult, examsResult, paymentsResult] = await Promise.all([
      supabase.from('users').select('school_id').eq('role', 'student').eq('is_active', true).in('school_id', schoolIds),
      supabase.from('users').select('school_id').eq('role', 'teacher').eq('is_active', true).in('school_id', schoolIds),
      supabase.from('exams').select('school_id').in('school_id', schoolIds),
      supabase.from('transactions').select('amount, school_id').eq('status', 'successful').in('school_id', schoolIds),
    ])

    // Aggregate counts by school_id
    const studentsBySchool = new Map<string, number>()
    for (const s of studentsResult.data ?? []) {
      studentsBySchool.set(s.school_id, (studentsBySchool.get(s.school_id) ?? 0) + 1)
    }

    const teachersBySchool = new Map<string, number>()
    for (const t of teachersResult.data ?? []) {
      teachersBySchool.set(t.school_id, (teachersBySchool.get(t.school_id) ?? 0) + 1)
    }

    const examsBySchool = new Map<string, number>()
    for (const e of examsResult.data ?? []) {
      examsBySchool.set(e.school_id, (examsBySchool.get(e.school_id) ?? 0) + 1)
    }

    const revenueBySchool = new Map<string, number>()
    for (const p of paymentsResult.data ?? []) {
      revenueBySchool.set(p.school_id, (revenueBySchool.get(p.school_id) ?? 0) + p.amount)
    }

    for (const school of schools) {
      schoolReports.push({
        schoolId: school.id,
        schoolName: school.name,
        totalStudents: studentsBySchool.get(school.id) ?? 0,
        totalTeachers: teachersBySchool.get(school.id) ?? 0,
        totalExams: examsBySchool.get(school.id) ?? 0,
        avgScore: 0,
        passRate: 0,
        revenue: revenueBySchool.get(school.id) ?? 0,
      })
    }
  }

  // ─── Teacher Reports (batch queries, no N+1) ─────────────
  let teacherQuery = supabase.from('users').select('id, full_name').eq('role', 'teacher').eq('is_active', true)
  if (schoolId && role !== 'super_admin') {
    teacherQuery = teacherQuery.eq('school_id', schoolId)
  }
  const { data: teachers } = await teacherQuery.limit(50)

  const teacherReports: TeacherReport[] = []

  if (teachers && teachers.length > 0) {
    const teacherIds = teachers.map(t => t.id)

    // Batch: get exam and question counts for all teachers
    const [examsResult, questionsResult] = await Promise.all([
      supabase.from('exams').select('created_by').in('created_by', teacherIds),
      supabase.from('questions').select('created_by').in('created_by', teacherIds),
    ])

    const examsByTeacher = new Map<string, number>()
    for (const e of examsResult.data ?? []) {
      examsByTeacher.set(e.created_by, (examsByTeacher.get(e.created_by) ?? 0) + 1)
    }

    const questionsByTeacher = new Map<string, number>()
    for (const q of questionsResult.data ?? []) {
      questionsByTeacher.set(q.created_by, (questionsByTeacher.get(q.created_by) ?? 0) + 1)
    }

    for (const teacher of teachers) {
      teacherReports.push({
        teacherId: teacher.id,
        teacherName: teacher.full_name ?? 'Unknown',
        examsCreated: examsByTeacher.get(teacher.id) ?? 0,
        questionsCreated: questionsByTeacher.get(teacher.id) ?? 0,
        avgStudentScore: 0,
        totalStudents: 0,
      })
    }
  }

  // ─── Student Reports (batch queries, no N+1) ─────────────
  let studentQuery = supabase.from('users').select('id, full_name, email').eq('role', 'student').eq('is_active', true)
  if (schoolId && role !== 'super_admin') {
    studentQuery = studentQuery.eq('school_id', schoolId)
  }
  const { data: students } = await studentQuery.limit(50)

  const studentReports: StudentReport[] = []

  if (students && students.length > 0) {
    const studentIds = students.map(s => s.id)

    // Batch: get all exam sessions for these students
    const { data: allSessions } = await supabase
      .from('exam_sessions')
      .select('student_id, percentage')
      .in('student_id', studentIds)
      .in('status', ['submitted', 'timed_out', 'graded'])

    // Aggregate by student
    const sessionsByStudent = new Map<string, number[]>()
    for (const s of allSessions ?? []) {
      const scores = sessionsByStudent.get(s.student_id) ?? []
      if (s.percentage !== null) {
        scores.push(s.percentage)
      }
      sessionsByStudent.set(s.student_id, scores)
    }

    for (const student of students) {
      const scores = sessionsByStudent.get(student.id) ?? []
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0
      const passRate = scores.length > 0 ? Math.round(scores.filter(s => s >= 50).length / scores.length * 100) : 0

      studentReports.push({
        studentId: student.id,
        studentName: student.full_name ?? student.email?.split('@')[0] ?? 'Unknown',
        email: student.email ?? '',
        examsCompleted: scores.length,
        avgScore,
        highestScore,
        passRate,
      })
    }
  }

  // ─── Revenue Report ──────────────────────────────────────
  let paymentQuery = supabase.from('transactions').select('amount, status, created_at')
  if (schoolId && role !== 'super_admin') {
    paymentQuery = paymentQuery.eq('school_id', schoolId)
  }
  if (dateFrom) {
    paymentQuery = paymentQuery.gte('created_at', dateFrom)
  }
  if (dateTo) {
    paymentQuery = paymentQuery.lte('created_at', dateTo)
  }
  const { data: payments } = await paymentQuery

  const allPayments = payments ?? []
  const successfulPayments = allPayments.filter(p => p.status === 'successful')
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0)
  const averagePayment = successfulPayments.length > 0 ? Math.round(totalRevenue / successfulPayments.length) : 0

  const revenueReport: RevenueReport = {
    period: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
    totalRevenue,
    totalPayments: allPayments.length,
    successfulPayments: successfulPayments.length,
    failedPayments: allPayments.filter(p => p.status === 'failed').length,
    averagePayment,
  }

  return {
    schoolReports,
    teacherReports,
    studentReports,
    revenueReport,
  }
}
