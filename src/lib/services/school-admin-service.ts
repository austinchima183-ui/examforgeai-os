// ============================================================================
// ExamForge AI — School Admin Data Service
// ============================================================================
// Real Supabase queries for classes, timetable, attendance, fees, calendar.
// All queries are scoped by school_id to prevent data leakage.
// ============================================================================

import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { isDevAdapterMode, devClasses } from '@/lib/supabase/dev-adapter'
import type { ProfileRow, AttendanceRecordRow, TimetableSlotRow } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Shared Types
// ──────────────────────────────────────────────────────────────

export interface TeacherOption {
  id: string
  full_name: string
  email: string
}

export interface StudentOption {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

export interface SubjectOption {
  id: string
  name: string
  code: string | null
}

// ──────────────────────────────────────────────────────────────
// Classes
// ──────────────────────────────────────────────────────────────

export interface ClassListItem {
  id: string
  name: string
  section: string | null
  teacher_name: string | null
  teacher_id: string | null
  student_count: number
  subject_names: string[]
  room_number: string | null
  capacity: number | null
  is_active: boolean
  created_at: string
}

export interface ClassesPageData {
  classes: ClassListItem[]
  totalClasses: number
  activeClasses: number
  totalStudents: number
  teachers: TeacherOption[]
  subjects: SubjectOption[]
}

export async function getClassesData(schoolId: string): Promise<ClassesPageData> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    const classList: ClassListItem[] = devClasses.map((c) => ({
      id: c.id,
      name: c.name,
      section: null,
      teacher_name: c.teacher_name,
      teacher_id: null,
      student_count: c.student_count,
      subject_names: [c.subject],
      room_number: null,
      capacity: 40,
      is_active: true,
      created_at: new Date().toISOString(),
    }))
    return {
      classes: classList,
      totalClasses: classList.length,
      activeClasses: classList.length,
      totalStudents: classList.reduce((sum, c) => sum + c.student_count, 0),
      teachers: [{ id: 'dev-t1', full_name: 'Mrs. Adeyemi', email: 'adeyemi@dev.ai' }, { id: 'dev-t2', full_name: 'Mr. Okonkwo', email: 'okonkwo@dev.ai' }],
      subjects: [{ id: 'dev-s1', name: 'Mathematics', code: 'MATH' }, { id: 'dev-s2', name: 'English', code: 'ENG' }],
    }
  }

  // SECURITY: First get all class IDs for this school to scope enrollment/subject queries
  const { data: schoolClasses } = await supabase.from('classes').select('id').eq('school_id', schoolId)
  const schoolClassIds = (schoolClasses ?? []).map(c => c.id)
  const safeClassIds = schoolClassIds.length > 0 ? schoolClassIds : ['__none__']

  const [classesRes, enrollmentsRes, classSubjectsRes, teachersRes, subjectsRes] = await Promise.all([
    supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
    supabase.from('class_students').select('class_id, is_active').eq('is_active', true).in('class_id', safeClassIds), // SECURITY: scope to school classes
    supabase.from('class_subjects').select('class_id, subject_id, subjects(id, name)').in('class_id', safeClassIds), // SECURITY: scope to school classes
    supabase.from('users').select('id, full_name, email').eq('role', 'teacher').eq('school_id', schoolId).eq('is_active', true),
    supabase.from('subjects').select('id, name, code').eq('school_id', schoolId).eq('is_active', true),
  ])

  const classes = classesRes.data ?? []
  const enrollments = enrollmentsRes.data ?? []
  const classSubjects = classSubjectsRes.data ?? []
  const teachers = teachersRes.data ?? []
  const subjects = subjectsRes.data ?? []

  // Build student count per class
  const studentCountMap = new Map<string, number>()
  for (const e of enrollments) {
    studentCountMap.set(e.class_id, (studentCountMap.get(e.class_id) ?? 0) + 1)
  }

  // Build subject names per class
  const subjectNamesMap = new Map<string, string[]>()
  for (const cs of classSubjects) {
    const subjectData = cs.subjects as unknown as { id: string; name: string } | null
    if (subjectData) {
      const names = subjectNamesMap.get(cs.class_id) ?? []
      names.push(subjectData.name)
      subjectNamesMap.set(cs.class_id, names)
    }
  }

  // Build teacher name map
  const teacherMap = new Map<string, string>()
  for (const t of teachers) {
    teacherMap.set(t.id, t.full_name ?? t.email)
  }

  const classList: ClassListItem[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    teacher_name: c.teacher_id ? teacherMap.get(c.teacher_id) ?? null : null,
    teacher_id: c.teacher_id,
    student_count: studentCountMap.get(c.id) ?? 0,
    subject_names: subjectNamesMap.get(c.id) ?? [],
    room_number: c.room_number,
    capacity: c.capacity,
    is_active: c.is_active,
    created_at: c.created_at,
  }))

  return {
    classes: classList,
    totalClasses: classList.length,
    activeClasses: classList.filter((c) => c.is_active).length,
    totalStudents: classList.reduce((sum, c) => sum + c.student_count, 0),
    teachers: teachers.map((t) => ({ id: t.id, full_name: t.full_name ?? t.email, email: t.email })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
  }
}

export interface ClassDetailData {
  class: {
    id: string
    name: string
    section: string | null
    teacher_id: string | null
    room_number: string | null
    capacity: number | null
    is_active: boolean
  }
  students: StudentOption[]
  subjects: SubjectOption[]
  teacher: TeacherOption | null
}

export async function getClassDetail(classId: string, schoolId: string): Promise<ClassDetailData | null> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return null
  }

  const { data: classData } = await supabase.from('classes').select('*').eq('id', classId).eq('school_id', schoolId).single()
  if (!classData) return null

  const [enrollmentsRes, classSubjectsRes] = await Promise.all([
    supabase.from('class_students').select('student_id, profiles(id, full_name, email, avatar_url)').eq('class_id', classId).eq('is_active', true),
    supabase.from('class_subjects').select('subject_id, subjects(id, name, code)').eq('class_id', classId),
  ])

  const students = ((enrollmentsRes.data ?? []) as unknown as { student_id: string; profiles: ProfileRow | null }[]).map((e) => {
    const p = e.profiles
    return { id: p?.id ?? e.student_id, full_name: p?.full_name ?? 'Unknown', email: p?.email ?? '', avatar_url: p?.avatar_url ?? null }
  })

  const subjectList = ((classSubjectsRes.data ?? []) as unknown as { subject_id: string; subjects: { id: string; name: string; code: string | null } | null }[]).map((cs) => {
    const s = cs.subjects
    return { id: s?.id ?? cs.subject_id, name: s?.name ?? 'Unknown', code: s?.code ?? null }
  })

  let teacher: TeacherOption | null = null
  if (classData.teacher_id) {
    const { data: tData } = await supabase.from('users').select('id, full_name, email').eq('id', classData.teacher_id).single()
    if (tData) teacher = { id: tData.id, full_name: tData.full_name ?? tData.email, email: tData.email }
  }

  return {
    class: {
      id: classData.id,
      name: classData.name,
      section: classData.section,
      teacher_id: classData.teacher_id,
      room_number: classData.room_number,
      capacity: classData.capacity,
      is_active: classData.is_active,
    },
    students,
    subjects: subjectList,
    teacher,
  }
}

// ──────────────────────────────────────────────────────────────
// Timetable
// ──────────────────────────────────────────────────────────────

export interface TimetableSlotItem {
  id: string
  class_id: string
  subject_id: string | null
  teacher_id: string | null
  subject_name: string | null
  teacher_name: string | null
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  room: string | null
  is_break: boolean
}

export interface TimetablePageData {
  slots: TimetableSlotItem[]
  classes: { id: string; name: string; section: string | null }[]
  subjects: SubjectOption[]
  teachers: TeacherOption[]
}

export async function getTimetableData(schoolId: string, classId?: string): Promise<TimetablePageData> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      slots: [],
      classes: devClasses.map((c) => ({ id: c.id, name: c.name, section: null })),
      subjects: [{ id: 'dev-s1', name: 'Mathematics', code: 'MATH' }, { id: 'dev-s2', name: 'English', code: 'ENG' }],
      teachers: [{ id: 'dev-t1', full_name: 'Mrs. Adeyemi', email: 'adeyemi@dev.ai' }],
    }
  }

  let slotsQuery = supabase.from('timetable_slots').select('*, subjects(id, name), profiles(id, full_name)').order('day_of_week').order('period_number')
  if (classId) {
    slotsQuery = slotsQuery.eq('class_id', classId)
  } else {
    // Get slots for all classes in the school
    const { data: schoolClasses } = await supabase.from('classes').select('id').eq('school_id', schoolId)
    const classIds = (schoolClasses ?? []).map((c) => c.id)
    if (classIds.length > 0) {
      slotsQuery = slotsQuery.in('class_id', classIds)
    }
  }

  const [slotsRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
    slotsQuery,
    supabase.from('classes').select('id, name, section').eq('school_id', schoolId).eq('is_active', true).order('name'),
    supabase.from('subjects').select('id, name, code').eq('school_id', schoolId).eq('is_active', true),
    supabase.from('users').select('id, full_name, email').eq('role', 'teacher').eq('school_id', schoolId).eq('is_active', true),
  ])

  const slots = ((slotsRes.data ?? []) as unknown as (TimetableSlotRow & { subjects: { name: string } | null; profiles: { full_name: string } | null })[]).map((s) => ({
    id: s.id,
    class_id: s.class_id,
    subject_id: s.subject_id,
    teacher_id: s.teacher_id,
    subject_name: s.subjects?.name ?? null,
    teacher_name: s.profiles?.full_name ?? null,
    day_of_week: s.day_of_week,
    period_number: s.period_number,
    start_time: s.start_time,
    end_time: s.end_time,
    room: s.room,
    is_break: s.is_break,
  }))

  return {
    slots,
    classes: (classesRes.data ?? []).map((c) => ({ id: c.id, name: c.name, section: c.section })),
    subjects: (subjectsRes.data ?? []).map((s) => ({ id: s.id, name: s.name, code: s.code })),
    teachers: (teachersRes.data ?? []).map((t) => ({ id: t.id, full_name: t.full_name ?? t.email, email: t.email })),
  }
}

// ──────────────────────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────────────────────

export interface AttendanceRecordItem {
  id: string
  student_id: string
  student_name: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  remarks: string | null
}

export interface AttendanceStats {
  totalRecords: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export interface AttendancePageData {
  records: AttendanceRecordItem[]
  stats: AttendanceStats
  classes: { id: string; name: string; section: string | null }[]
  chronicAbsentees: { student_id: string; student_name: string; absence_rate: number }[]
}

export async function getAttendanceData(schoolId: string, classId?: string, date?: string): Promise<AttendancePageData> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      records: [],
      stats: { totalRecords: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0, attendanceRate: 0 },
      classes: devClasses.map((c) => ({ id: c.id, name: c.name, section: null })),
      chronicAbsentees: [],
    }
  }

  const targetDate = date ?? new Date().toISOString().split('T')[0]

  // Get classes
  const { data: classesData } = await supabase.from('classes').select('id, name, section').eq('school_id', schoolId).eq('is_active', true).order('name')
  const classes = (classesData ?? []).map((c) => ({ id: c.id, name: c.name, section: c.section }))

  // Build attendance query
  let recordsQuery = supabase.from('attendance').select('*, profiles(id, full_name)').eq('school_id', schoolId).eq('date', targetDate)
  if (classId) {
    recordsQuery = recordsQuery.eq('class_id', classId)
  }

  const { data: recordsData } = await recordsQuery

  const records: AttendanceRecordItem[] = ((recordsData ?? []) as unknown as (AttendanceRecordRow & { profiles: { full_name: string } | null })[]).map((r) => ({
    id: r.id,
    student_id: r.student_id,
    student_name: r.profiles?.full_name ?? 'Unknown',
    class_id: r.class_id,
    date: r.date,
    status: r.status,
    remarks: r.remarks,
  }))

  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length
  const lateCount = records.filter((r) => r.status === 'late').length
  const excusedCount = records.filter((r) => r.status === 'excused').length
  const totalRecords = records.length

  // Get chronic absentees (>20% absence rate in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: monthlyRecords } = await supabase
    .from('attendance')
    .select('student_id, status, profiles(id, full_name)')
    .eq('school_id', schoolId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

  const studentAbsenceMap = new Map<string, { name: string; total: number; absent: number }>()
  for (const r of monthlyRecords ?? []) {
    const p = (r as unknown as AttendanceRecordRow & { profiles: { full_name: string } | null }).profiles
    const name = p?.full_name ?? 'Unknown'
    const existing = studentAbsenceMap.get(r.student_id) ?? { name, total: 0, absent: 0 }
    existing.total++
    if (r.status === 'absent') existing.absent++
    studentAbsenceMap.set(r.student_id, existing)
  }

  const chronicAbsentees = Array.from(studentAbsenceMap.entries())
    .filter(([, v]) => v.total > 0 && (v.absent / v.total) > 0.2)
    .map(([id, v]) => ({ student_id: id, student_name: v.name, absence_rate: Math.round((v.absent / v.total) * 100) }))

  return {
    records,
    stats: {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
    },
    classes,
    chronicAbsentees,
  }
}

// ──────────────────────────────────────────────────────────────
// Fees
// ──────────────────────────────────────────────────────────────

export interface FeeStructureItem {
  id: string
  name: string
  fee_type: string
  amount: number
  class_id: string | null
  class_name: string | null
  due_date: string | null
  description: string | null
  is_mandatory: boolean
  is_active: boolean
}

export interface FeeAssignmentItem {
  id: string
  fee_structure_id: string
  fee_name: string
  fee_type: string
  student_id: string
  student_name: string
  amount_due: number
  amount_paid: number
  status: string
  due_date: string | null
  paid_at: string | null
}

export interface FeePaymentItem {
  id: string
  fee_assignment_id: string
  student_name: string
  amount: number
  payment_method: string
  receipt_number: string | null
  paid_at: string
}

export interface FeesPageData {
  structures: FeeStructureItem[]
  assignments: FeeAssignmentItem[]
  recentPayments: FeePaymentItem[]
  totalRevenue: number
  totalPending: number
  totalOverdue: number
  collectionRate: number
  classes: { id: string; name: string }[]
}

export async function getFeesData(schoolId: string): Promise<FeesPageData> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return {
      structures: [],
      assignments: [],
      recentPayments: [],
      totalRevenue: 0,
      totalPending: 0,
      totalOverdue: 0,
      collectionRate: 0,
      classes: devClasses.map((c) => ({ id: c.id, name: c.name })),
    }
  }

  const [structuresRes, assignmentsRes, paymentsRes, classesRes] = await Promise.all([
    supabase.from('fee_structures').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
    supabase.from('fee_assignments').select('*, fee_structures(id, name, fee_type), profiles(id, full_name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(100), // SECURITY: scope to school
    supabase.from('fee_payments').select('*, profiles(id, full_name)').eq('school_id', schoolId).order('paid_at', { ascending: false }).limit(20), // SECURITY: scope to school
    supabase.from('classes').select('id, name').eq('school_id', schoolId).eq('is_active', true),
  ])

  const structures: FeeStructureItem[] = (structuresRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    fee_type: s.fee_type,
    amount: s.amount,
    class_id: s.class_id,
    class_name: null,
    due_date: s.due_date,
    description: s.description,
    is_mandatory: s.is_mandatory,
    is_active: s.is_active,
  }))

  const assignments: FeeAssignmentItem[] = ((assignmentsRes.data ?? []) as unknown as ({ id: string; fee_structure_id: string; student_id: string; amount_due: number; amount_paid: number; status: string; due_date: string | null; paid_at: string | null; fee_structures: { name: string; fee_type: string } | null; profiles: { full_name: string } | null })[]).map((a) => ({
    id: a.id,
    fee_structure_id: a.fee_structure_id,
    fee_name: a.fee_structures?.name ?? 'Unknown',
    fee_type: a.fee_structures?.fee_type ?? 'other',
    student_id: a.student_id,
    student_name: a.profiles?.full_name ?? 'Unknown',
    amount_due: a.amount_due,
    amount_paid: a.amount_paid,
    status: a.status,
    due_date: a.due_date,
    paid_at: a.paid_at,
  }))

  const recentPayments: FeePaymentItem[] = ((paymentsRes.data ?? []) as unknown as ({ id: string; fee_assignment_id: string; amount: number; payment_method: string; receipt_number: string | null; paid_at: string; profiles: { full_name: string } | null })[]).map((p) => ({
    id: p.id,
    fee_assignment_id: p.fee_assignment_id,
    student_name: p.profiles?.full_name ?? 'Unknown',
    amount: p.amount,
    payment_method: p.payment_method,
    receipt_number: p.receipt_number,
    paid_at: p.paid_at,
  }))

  const totalRevenue = assignments.filter((a) => a.status === 'paid').reduce((sum, a) => sum + a.amount_paid, 0)
  const totalPending = assignments.filter((a) => a.status === 'pending').reduce((sum, a) => sum + (a.amount_due - a.amount_paid), 0)
  const totalOverdue = assignments.filter((a) => a.status === 'overdue').reduce((sum, a) => sum + (a.amount_due - a.amount_paid), 0)
  const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0)
  const collectionRate = totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0

  return {
    structures,
    assignments,
    recentPayments,
    totalRevenue,
    totalPending,
    totalOverdue,
    collectionRate,
    classes: (classesRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
  }
}

// ──────────────────────────────────────────────────────────────
// Calendar
// ──────────────────────────────────────────────────────────────

export interface SchoolEventItem {
  id: string
  title: string
  description: string | null
  event_type: string
  start_date: string
  end_date: string
  is_all_day: boolean
  location: string | null
  color: string | null
  is_active: boolean
}

export interface CalendarPageData {
  events: SchoolEventItem[]
  eventTypes: { value: string; label: string }[]
}

export async function getCalendarData(schoolId: string, month?: number, year?: number): Promise<CalendarPageData> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return { events: [], eventTypes: [
      { value: 'academic', label: 'Academic' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'exam', label: 'Exam' },
      { value: 'deadline', label: 'Deadline' },
      { value: 'event', label: 'Event' },
      { value: 'sports', label: 'Sports' },
      { value: 'cultural', label: 'Cultural' },
    ] }
  }

  const now = new Date()
  const targetMonth = month ?? now.getMonth()
  const targetYear = year ?? now.getFullYear()

  const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
  const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]

  const { data: eventsData } = await supabase
    .from('school_calendar_events')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .gte('start_date', startDate)
    .lte('end_date', endDate)
    .order('start_date')

  const events: SchoolEventItem[] = (eventsData ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    event_type: e.event_type,
    start_date: e.start_date,
    end_date: e.end_date,
    is_all_day: e.is_all_day,
    location: e.location,
    color: e.color,
    is_active: e.is_active,
  }))

  return {
    events,
    eventTypes: [
      { value: 'academic', label: 'Academic' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'exam', label: 'Exam' },
      { value: 'deadline', label: 'Deadline' },
      { value: 'event', label: 'Event' },
      { value: 'sports', label: 'Sports' },
      { value: 'cultural', label: 'Cultural' },
    ],
  }
}

// ──────────────────────────────────────────────────────────────
// Students for dropdowns
// ──────────────────────────────────────────────────────────────

export async function getStudentsForSchool(schoolId: string): Promise<StudentOption[]> {
  const supabase = await requireSupabase()

  // ── Dev Adapter Fallback ──
  if (!supabase && isDevAdapterMode()) {
    return [{ id: 'dev-st1', full_name: 'Adebayo Ogun', email: 'adebayo@dev.ai', avatar_url: null }]
  }

  const { data } = await supabase.from('users').select('id, full_name, email, avatar_url').eq('role', 'student').eq('school_id', schoolId).eq('is_active', true).order('full_name')
  return (data ?? []).map((s) => ({ id: s.id, full_name: s.full_name ?? s.email, email: s.email, avatar_url: s.avatar_url }))
}
