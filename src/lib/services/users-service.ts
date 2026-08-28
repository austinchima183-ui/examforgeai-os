// ============================================================================
// ExamForge AI — Users Data Service (Students, Teachers, Parents)
// ============================================================================
// Real Supabase queries for user management with role-based filtering.
// All queries are scoped by role and school_id to prevent data leakage.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type { ProfileRow } from '@/lib/supabase/types'
import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface StudentListItem {
  id: string
  name: string
  email: string
  avatar_url: string | null
  school_id: string | null
  class_name: string | null
  subjects: string[]
  avg_score: number
  exams_completed: number
  is_active: boolean
  created_at: string
}

export interface TeacherListItem {
  id: string
  name: string
  email: string
  avatar_url: string | null
  school_id: string | null
  department: string | null
  subjects: string[]
  classes: string[]
  exam_count: number
  avg_student_score: number
  is_active: boolean
  created_at: string
}

export interface ParentListItem {
  id: string
  name: string
  email: string
  avatar_url: string | null
  phone: string | null
  children: { id: string; name: string; class_name: string | null }[]
  is_active: boolean
  last_active_at: string | null
  created_at: string
}

export interface StudentsPageData {
  students: StudentListItem[]
  total: number
  activeStudents: number
  avgScore: number
  totalExams: number
}

export interface TeachersPageData {
  teachers: TeacherListItem[]
  total: number
  activeTeachers: number
  totalExams: number
  avgScore: number
}

export interface ParentsPageData {
  parents: ParentListItem[]
  total: number
  activeParents: number
  totalChildren: number
  avgChildrenPerParent: number
}

// ──────────────────────────────────────────────────────────────
// Students (scoped by role and schoolId)
// ──────────────────────────────────────────────────────────────

export async function getStudentsData(
  schoolId?: string | null,
  role?: UserRole | null
): Promise<StudentsPageData> {
  const supabase = await createClient()

  // CRITICAL: If schoolId is not provided and role is not super_admin,
  // return empty data to prevent cross-school data leakage
  if (!schoolId && role !== 'super_admin') {
    return { students: [], total: 0, activeStudents: 0, avgScore: 0, totalExams: 0 }
  }

  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(100)

  // Scope by school unless super_admin with no schoolId
  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data: students, error } = await query

  if (error) {
    return { students: [], total: 0, activeStudents: 0, avgScore: 0, totalExams: 0 }
  }

  // Get exam session stats for students (batch query)
  const studentIds = (students ?? []).map(s => s.id)
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('student_id, percentage, status')
    .in('student_id', studentIds.length > 0 ? studentIds : ['no-students'])

  // Calculate per-student stats
  const sessionsByStudent = new Map<string, { completed: number; totalPercentage: number; count: number }>()
  for (const session of sessions ?? []) {
    const existing = sessionsByStudent.get(session.student_id) ?? { completed: 0, totalPercentage: 0, count: 0 }
    if (session.status === 'submitted' || session.status === 'graded' || session.status === 'timed_out') {
      existing.completed++
      if (session.percentage !== null) {
        existing.totalPercentage += session.percentage
        existing.count++
      }
    }
    sessionsByStudent.set(session.student_id, existing)
  }

  const studentList: StudentListItem[] = (students ?? []).map(student => {
    const stats = sessionsByStudent.get(student.id) ?? { completed: 0, totalPercentage: 0, count: 0 }
    const metadata = (student.metadata as Record<string, unknown>) ?? {}
    return {
      id: student.id,
      name: student.full_name ?? student.email,
      email: student.email,
      avatar_url: student.avatar_url,
      school_id: student.school_id,
      class_name: (metadata.class_name as string) ?? null,
      subjects: (metadata.subjects as string[]) ?? [],
      avg_score: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
      exams_completed: stats.completed,
      is_active: student.is_active,
      created_at: student.created_at,
    }
  })

  const activeStudents = studentList.filter(s => s.is_active).length
  const studentsWithScores = studentList.filter(s => s.avg_score > 0)
  const avgScore = studentsWithScores.length > 0
    ? Math.round(studentsWithScores.reduce((sum, s) => sum + s.avg_score, 0) / studentsWithScores.length)
    : 0
  const totalExams = studentList.reduce((sum, s) => sum + s.exams_completed, 0)

  return {
    students: studentList,
    total: studentList.length,
    activeStudents,
    avgScore,
    totalExams,
  }
}

// ──────────────────────────────────────────────────────────────
// Teachers (scoped by role and schoolId)
// ──────────────────────────────────────────────────────────────

export async function getTeachersData(
  schoolId?: string | null,
  role?: UserRole | null
): Promise<TeachersPageData> {
  const supabase = await createClient()

  // CRITICAL: Prevent cross-school data leakage
  if (!schoolId && role !== 'super_admin') {
    return { teachers: [], total: 0, activeTeachers: 0, totalExams: 0, avgScore: 0 }
  }

  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false })
    .limit(100)

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data: teachers, error } = await query

  if (error) {
    return { teachers: [], total: 0, activeTeachers: 0, totalExams: 0, avgScore: 0 }
  }

  // Get exam counts per teacher (batch query)
  const teacherIds = (teachers ?? []).map(t => t.id)
  const { data: exams } = await supabase
    .from('exams')
    .select('created_by')
    .in('created_by', teacherIds.length > 0 ? teacherIds : ['no-teachers'])

  const examCountByTeacher = new Map<string, number>()
  for (const exam of exams ?? []) {
    examCountByTeacher.set(exam.created_by, (examCountByTeacher.get(exam.created_by) ?? 0) + 1)
  }

  const teacherList: TeacherListItem[] = (teachers ?? []).map(teacher => {
    const metadata = (teacher.metadata as Record<string, unknown>) ?? {}
    return {
      id: teacher.id,
      name: teacher.full_name ?? teacher.email,
      email: teacher.email,
      avatar_url: teacher.avatar_url,
      school_id: teacher.school_id,
      department: (metadata.department as string) ?? null,
      subjects: (metadata.subjects as string[]) ?? [],
      classes: (metadata.classes as string[]) ?? [],
      exam_count: examCountByTeacher.get(teacher.id) ?? 0,
      avg_student_score: 0,
      is_active: teacher.is_active,
      created_at: teacher.created_at,
    }
  })

  const activeTeachers = teacherList.filter(t => t.is_active).length
  const totalExams = teacherList.reduce((sum, t) => sum + t.exam_count, 0)
  const teachersWithScores = teacherList.filter(t => t.avg_student_score > 0)
  const avgScore = teachersWithScores.length > 0
    ? Math.round(teachersWithScores.reduce((sum, t) => sum + t.avg_student_score, 0) / teachersWithScores.length)
    : 0

  return {
    teachers: teacherList,
    total: teacherList.length,
    activeTeachers,
    totalExams,
    avgScore,
  }
}

// ──────────────────────────────────────────────────────────────
// Parents (scoped by role and schoolId)
// ──────────────────────────────────────────────────────────────

export async function getParentsData(
  schoolId?: string | null,
  role?: UserRole | null
): Promise<ParentsPageData> {
  const supabase = await createClient()

  // CRITICAL: Prevent cross-school data leakage
  if (!schoolId && role !== 'super_admin') {
    return { parents: [], total: 0, activeParents: 0, totalChildren: 0, avgChildrenPerParent: 0 }
  }

  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'parent')
    .order('created_at', { ascending: false })
    .limit(100)

  if (schoolId) {
    query = query.eq('school_id', schoolId)
  }

  const { data: parents, error } = await query

  if (error) {
    return { parents: [], total: 0, activeParents: 0, totalChildren: 0, avgChildrenPerParent: 0 }
  }

  const parentList: ParentListItem[] = (parents ?? []).map(parent => {
    const metadata = (parent.metadata as Record<string, unknown>) ?? {}
    const children = (metadata.children as { id: string; name: string; class_name: string | null }[]) ?? []
    return {
      id: parent.id,
      name: parent.full_name ?? parent.email,
      email: parent.email,
      avatar_url: parent.avatar_url,
      phone: parent.phone,
      children,
      is_active: parent.is_active,
      last_active_at: parent.last_login_at,
      created_at: parent.created_at,
    }
  })

  const activeParents = parentList.filter(p => p.is_active).length
  const totalChildren = parentList.reduce((sum, p) => sum + p.children.length, 0)
  const avgChildrenPerParent = parentList.length > 0
    ? Math.round((totalChildren / parentList.length) * 10) / 10
    : 0

  return {
    parents: parentList,
    total: parentList.length,
    activeParents,
    totalChildren,
    avgChildrenPerParent,
  }
}

// ──────────────────────────────────────────────────────────────
// Generic User Profile
// ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function updateUserProfile(userId: string, updates: Partial<ProfileRow>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
