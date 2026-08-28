// ============================================================================
// ExamForge AI — Report Generator Service
// ============================================================================
// Generates structured report data for students, classes, schools, and exams.
// All queries are role-scoped and use batch operations (no N+1).
// ============================================================================

import { createClient } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface StudentReportData {
  studentId: string
  studentName: string
  email: string
  schoolName: string
  className: string
  transcript: {
    examId: string
    examTitle: string
    subjectName: string
    score: number
    totalMarks: number
    percentage: number
    grade: string
    submittedAt: string
  }[]
  subjectGrades: {
    subject: string
    avgScore: number
    examCount: number
    highestScore: number
    lowestScore: number
  }[]
  attendance: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendanceRate: number
  }
  overallStats: {
    totalExams: number
    avgScore: number
    highestScore: number
    passRate: number
  }
}

export interface ClassReportData {
  classId: string
  className: string
  level: string
  schoolName: string
  academicSession: string
  totalStudents: number
  totalExams: number
  gradeDistribution: {
    grade: string
    count: number
    percentage: number
  }[]
  subjectPerformance: {
    subject: string
    avgScore: number
    passRate: number
    examCount: number
  }[]
  studentRanking: {
    studentId: string
    studentName: string
    avgScore: number
    totalExams: number
    rank: number
  }[]
  classStats: {
    avgScore: number
    highestAvg: number
    lowestAvg: number
    passRate: number
  }
}

export interface SchoolReportData {
  schoolId: string
  schoolName: string
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalExams: number
  subjectAnalysis: {
    subject: string
    avgScore: number
    passRate: number
    examCount: number
    studentCount: number
  }[]
  teacherPerformance: {
    teacherId: string
    teacherName: string
    examsCreated: number
    avgStudentScore: number
    totalStudents: number
  }[]
  classBreakdown: {
    className: string
    studentCount: number
    avgScore: number
    passRate: number
  }[]
  schoolStats: {
    avgScore: number
    passRate: number
    revenue: number
  }
}

export interface ExamReportData {
  examId: string
  examTitle: string
  subjectName: string
  className: string
  totalMarks: number
  duration: number
  examType: string
  status: string
  scheduledAt: string | null
  totalSubmissions: number
  gradeDistribution: {
    grade: string
    count: number
    percentage: number
    minScore: number
    maxScore: number
  }[]
  questionAnalysis: {
    questionId: string
    questionText: string
    difficulty: number // percentage who got it right
    avgScore: number
    discrimination: number // how well it separates high/low performers
  }[]
  summaryStats: {
    avgScore: number
    medianScore: number
    highestScore: number
    lowestScore: number
    standardDeviation: number
    passRate: number
    passMark: number
  }
  itemAnalysis: {
    totalQuestions: number
    easyQuestions: number // >70% got right
    mediumQuestions: number // 30-70%
    hardQuestions: number // <30%
  }
}

// ──────────────────────────────────────────────────────────────
// Report Generators
// ──────────────────────────────────────────────────────────────

export async function generateStudentReport(studentId: string): Promise<StudentReportData | null> {
  const supabase = await createClient()

  // Get student profile
  const { data: student } = await supabase
    .from('users')
    .select('id, full_name, email, school_id')
    .eq('id', studentId)
    .single()

  if (!student) return null

  // Get school name
  let schoolName = 'N/A'
  if (student.school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', student.school_id)
      .single()
    schoolName = school?.name ?? 'N/A'
  }

  // Get class
  let className = 'N/A'
  const { data: enrollment } = await supabase
    .from('class_students')
    .select('class_id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle()

  if (enrollment) {
    const { data: classData } = await supabase
      .from('classes')
      .select('name')
      .eq('id', enrollment.class_id)
      .single()
    className = classData?.name ?? 'N/A'
  }

  // Get exam results
  const { data: results } = await supabase
    .from('exam_results')
    .select('exam_id, score_percentage, total_marks, score_percentage, grade, submitted_at, subject_id')
    .eq('student_id', studentId)

  // Get exam details
  const examIds = (results ?? []).map((r: { exam_id: string }) => r.exam_id)
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, subject_id')
    .in('id', examIds.length > 0 ? examIds : ['__none__'])

  // Get subject names
  const subjectIds = [...new Set([
    ...(exams ?? []).map((e: { subject_id: string }) => e.subject_id),
    ...(results ?? []).map((r: { subject_id: string | null }) => r.subject_id).filter(Boolean),
  ])] as string[]
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds.length > 0 ? subjectIds : ['__none__'])

  const examMap = new Map((exams ?? []).map((e: { id: string; title: string; subject_id: string }) => [e.id, e]))
  const subjectMap = new Map((subjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

  // Build transcript
  const transcript = (results ?? []).map((r: { exam_id: string; score_percentage: number; total_marks: number; grade: string | null; submitted_at: string; subject_id: string | null }) => {
    const exam = examMap.get(r.exam_id)
    return {
      examId: r.exam_id,
      examTitle: exam?.title ?? 'Unknown Exam',
      subjectName: subjectMap.get(r.subject_id ?? exam?.subject_id ?? '') ?? 'Unknown Subject',
      score: r.score_percentage,
      totalMarks: r.total_marks,
      percentage: r.score_percentage,
      grade: r.grade ?? calculateGrade(r.score_percentage),
      submittedAt: r.submitted_at,
    }
  })

  // Build subject grades
  const subjectScores = new Map<string, number[]>()
  for (const t of transcript) {
    const scores = subjectScores.get(t.subjectName) ?? []
    scores.push(t.percentage)
    subjectScores.set(t.subjectName, scores)
  }

  const subjectGrades = Array.from(subjectScores.entries()).map(([subject, scores]) => ({
    subject,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    examCount: scores.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
  }))

  // Get attendance
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)

  const attendanceData = attendanceRecords ?? []
  const totalDays = attendanceData.length
  const presentDays = attendanceData.filter((a: { status: string }) => a.status === 'present').length
  const absentDays = attendanceData.filter((a: { status: string }) => a.status === 'absent').length
  const lateDays = attendanceData.filter((a: { status: string }) => a.status === 'late').length

  // Overall stats
  const allPercentages = transcript.map(t => t.percentage)
  const totalExams = allPercentages.length
  const avgScore = totalExams > 0 ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / totalExams) : 0
  const highestScore = totalExams > 0 ? Math.max(...allPercentages) : 0
  const passRate = totalExams > 0 ? Math.round(allPercentages.filter(s => s >= 50).length / totalExams * 100) : 0

  return {
    studentId,
    studentName: student.full_name ?? student.email?.split('@')[0] ?? 'Unknown',
    email: student.email ?? '',
    schoolName,
    className,
    transcript,
    subjectGrades,
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: totalDays > 0 ? Math.round(presentDays / totalDays * 100) : 0,
    },
    overallStats: {
      totalExams,
      avgScore,
      highestScore,
      passRate,
    },
  }
}

export async function generateClassReport(classId: string): Promise<ClassReportData | null> {
  const supabase = await createClient()

  // Get class
  const { data: classData } = await supabase
    .from('classes')
    .select('id, name, level, school_id, academic_session')
    .eq('id', classId)
    .single()

  if (!classData) return null

  // Get school name
  let schoolName = 'N/A'
  if (classData.school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', classData.school_id)
      .single()
    schoolName = school?.name ?? 'N/A'
  }

  // Get students in class
  const { data: enrollments } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId)

  const studentIds = (enrollments ?? []).map((e: { student_id: string }) => e.student_id)
  const totalStudents = studentIds.length

  // Get exam results for all students
  const { data: results } = await supabase
    .from('exam_results')
    .select('student_id, percentage, grade, exam_id')
    .in('student_id', studentIds.length > 0 ? studentIds : ['__none__'])

  // Get exams for this class
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, subject_id')
    .eq('class_id', classId)

  const totalExams = (exams ?? []).length
  const examSubjectIds = (exams ?? []).map((e: { subject_id: string }) => e.subject_id)
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', examSubjectIds.length > 0 ? examSubjectIds : ['__none__'])

  const subjectMap = new Map((subjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

  // Grade distribution
  const gradeCounts = new Map<string, number>()
  for (const r of results ?? []) {
    const grade = r.grade ?? calculateGrade(r.percentage)
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1)
  }

  const totalResults = (results ?? []).length
  const gradeDistribution = Array.from(gradeCounts.entries())
    .map(([grade, count]) => ({ grade, count, percentage: totalResults > 0 ? Math.round(count / totalResults * 100) : 0 }))
    .sort((a, b) => a.grade.localeCompare(b.grade))

  // Subject performance
  const subjectScores = new Map<string, number[]>()
  for (const exam of exams ?? []) {
    const subjectName = subjectMap.get(exam.subject_id) ?? 'Unknown'
    const examResults = (results ?? []).filter((r: { exam_id: string }) => r.exam_id === exam.id)
    const scores = examResults.map((r: { percentage: number }) => r.percentage)
    const existing = subjectScores.get(subjectName) ?? []
    subjectScores.set(subjectName, [...existing, ...scores])
  }

  const subjectPerformance = Array.from(subjectScores.entries()).map(([subject, scores]) => ({
    subject,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    passRate: scores.length > 0 ? Math.round(scores.filter(s => s >= 50).length / scores.length * 100) : 0,
    examCount: (exams ?? []).filter((e: { subject_id: string }) => subjectMap.get(e.subject_id) === subject).length,
  }))

  // Student ranking
  const { data: studentProfiles } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', studentIds.length > 0 ? studentIds : ['__none__'])

  const studentMap = new Map((studentProfiles ?? []).map((s: { id: string; full_name: string | null }) => [s.id, s.full_name ?? 'Unknown']))

  const studentScores = new Map<string, { total: number; count: number }>()
  for (const r of results ?? []) {
    const existing = studentScores.get(r.student_id) ?? { total: 0, count: 0 }
    existing.total += r.percentage
    existing.count += 1
    studentScores.set(r.student_id, existing)
  }

  const studentRanking = Array.from(studentScores.entries())
    .map(([studentId, data]) => ({
      studentId,
      studentName: studentMap.get(studentId) ?? 'Unknown',
      avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
      totalExams: data.count,
      rank: 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .map((s, idx) => ({ ...s, rank: idx + 1 }))

  const allAvgs = studentRanking.map(s => s.avgScore)
  const classAvgScore = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : 0
  const allPercentages = (results ?? []).map((r: { percentage: number }) => r.percentage)

  return {
    classId,
    className: classData.name,
    level: classData.level,
    schoolName,
    academicSession: classData.academic_session ?? 'N/A',
    totalStudents,
    totalExams,
    gradeDistribution,
    subjectPerformance,
    studentRanking,
    classStats: {
      avgScore: classAvgScore,
      highestAvg: allAvgs.length > 0 ? Math.max(...allAvgs) : 0,
      lowestAvg: allAvgs.length > 0 ? Math.min(...allAvgs) : 0,
      passRate: allPercentages.length > 0 ? Math.round(allPercentages.filter(s => s >= 50).length / allPercentages.length * 100) : 0,
    },
  }
}

export async function generateSchoolReport(schoolId: string): Promise<SchoolReportData | null> {
  const supabase = await createClient()

  // Get school
  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', schoolId)
    .single()

  if (!school) return null

  // Batch queries for counts
  const [studentsRes, teachersRes, classesRes, examsRes, paymentsRes] = await Promise.all([
    supabase.from('users').select('id').eq('school_id', schoolId).eq('role', 'student').eq('is_active', true),
    supabase.from('users').select('id').eq('school_id', schoolId).eq('role', 'teacher').eq('is_active', true),
    supabase.from('classes').select('id').eq('school_id', schoolId).eq('is_active', true),
    supabase.from('exams').select('id, subject_id, created_by').eq('school_id', schoolId),
    supabase.from('transactions').select('amount').eq('school_id', schoolId).eq('status', 'successful'),
  ])

  const totalStudents = (studentsRes.data ?? []).length
  const totalTeachers = (teachersRes.data ?? []).length
  const totalClasses = (classesRes.data ?? []).length
  const totalExams = (examsRes.data ?? []).length
  const revenue = (paymentsRes.data ?? []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

  // Subject analysis
  const examSubjectIds = [...new Set((examsRes.data ?? []).map((e: { subject_id: string }) => e.subject_id))]
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', examSubjectIds.length > 0 ? examSubjectIds : ['__none__'])

  const subjectMap = new Map((subjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

  // Get all exam results for this school's exams
  const examIds = (examsRes.data ?? []).map((e: { id: string }) => e.id)
  const { data: results } = await supabase
    .from('exam_results')
    .select('exam_id, percentage, student_id')
    .in('exam_id', examIds.length > 0 ? examIds : ['__none__'])

  // Build subject analysis
  const subjectExamMap = new Map<string, string[]>() // subjectId -> examIds
  for (const exam of examsRes.data ?? []) {
    const existing = subjectExamMap.get(exam.subject_id) ?? []
    existing.push(exam.id)
    subjectExamMap.set(exam.subject_id, existing)
  }

  const subjectAnalysis = Array.from(subjectExamMap.entries()).map(([subjectId, eIds]) => {
    const subjectResults = (results ?? []).filter((r: { exam_id: string }) => eIds.includes(r.exam_id))
    const scores = subjectResults.map((r: { percentage: number }) => r.percentage)
    const studentSet = new Set(subjectResults.map((r: { student_id: string }) => r.student_id))

    return {
      subject: subjectMap.get(subjectId) ?? 'Unknown',
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: scores.length > 0 ? Math.round(scores.filter(s => s >= 50).length / scores.length * 100) : 0,
      examCount: eIds.length,
      studentCount: studentSet.size,
    }
  })

  // Teacher performance
  const teacherIds = [...new Set((examsRes.data ?? []).map((e: { created_by: string }) => e.created_by).filter(Boolean))] as string[]
  const { data: teacherProfiles } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', teacherIds.length > 0 ? teacherIds : ['__none__'])

  const teacherMap = new Map((teacherProfiles ?? []).map((t: { id: string; full_name: string | null }) => [t.id, t.full_name ?? 'Unknown']))

  const teacherExamMap = new Map<string, string[]>()
  for (const exam of examsRes.data ?? []) {
    if (exam.created_by) {
      const existing = teacherExamMap.get(exam.created_by) ?? []
      existing.push(exam.id)
      teacherExamMap.set(exam.created_by, existing)
    }
  }

  const teacherPerformance = Array.from(teacherExamMap.entries()).map(([tId, eIds]) => {
    const teacherResults = (results ?? []).filter((r: { exam_id: string }) => eIds.includes(r.exam_id))
    const scores = teacherResults.map((r: { percentage: number }) => r.percentage)
    const studentSet = new Set(teacherResults.map((r: { student_id: string }) => r.student_id))

    return {
      teacherId: tId,
      teacherName: teacherMap.get(tId) ?? 'Unknown',
      examsCreated: eIds.length,
      avgStudentScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      totalStudents: studentSet.size,
    }
  })

  // Class breakdown
  const classIds = (classesRes.data ?? []).map((c: { id: string }) => c.id)
  const { data: classDetails } = await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds.length > 0 ? classIds : ['__none__'])

  const { data: classEnrollments } = await supabase
    .from('class_students')
    .select('class_id')
    .in('class_id', classIds.length > 0 ? classIds : ['__none__'])

  const classStudentCount = new Map<string, number>()
  for (const e of classEnrollments ?? []) {
    classStudentCount.set(e.class_id, (classStudentCount.get(e.class_id) ?? 0) + 1)
  }

  // Get class-scoped exam results
  const { data: classExams } = await supabase
    .from('exams')
    .select('id, class_id')
    .in('class_id', classIds.length > 0 ? classIds : ['__none__'])

  const classExamIds = (classExams ?? []).map((e: { id: string }) => e.id)
  const { data: classResults } = await supabase
    .from('exam_results')
    .select('exam_id, percentage')
    .in('exam_id', classExamIds.length > 0 ? classExamIds : ['__none__'])

  const classExamMap = new Map<string, string[]>()
  for (const e of classExams ?? []) {
    const existing = classExamMap.get(e.class_id) ?? []
    existing.push(e.id)
    classExamMap.set(e.class_id, existing)
  }

  const classBreakdown = (classDetails ?? []).map((c: { id: string; name: string }) => {
    const cExamIds = classExamMap.get(c.id) ?? []
    const cResults = (classResults ?? []).filter((r: { exam_id: string }) => cExamIds.includes(r.exam_id))
    const scores = cResults.map((r: { percentage: number }) => r.percentage)

    return {
      className: c.name,
      studentCount: classStudentCount.get(c.id) ?? 0,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: scores.length > 0 ? Math.round(scores.filter(s => s >= 50).length / scores.length * 100) : 0,
    }
  })

  // Overall stats
  const allScores = (results ?? []).map((r: { percentage: number }) => r.percentage)
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0
  const passRate = allScores.length > 0 ? Math.round(allScores.filter(s => s >= 50).length / allScores.length * 100) : 0

  return {
    schoolId,
    schoolName: school.name,
    totalStudents,
    totalTeachers,
    totalClasses,
    totalExams,
    subjectAnalysis,
    teacherPerformance,
    classBreakdown,
    schoolStats: {
      avgScore,
      passRate,
      revenue,
    },
  }
}

export async function generateExamReport(examId: string): Promise<ExamReportData | null> {
  const supabase = await createClient()

  // Get exam
  const { data: exam } = await supabase
    .from('exams')
    .select('id, title, subject_id, class_id, total_marks, duration, exam_type, status, scheduled_at')
    .eq('id', examId)
    .single()

  if (!exam) return null

  // Get subject and class
  const [subjectRes, classRes] = await Promise.all([
    supabase.from('subjects').select('name').eq('id', exam.subject_id).single(),
    supabase.from('classes').select('name').eq('id', exam.class_id).single(),
  ])

  // Get results
  const { data: results } = await supabase
    .from('exam_results')
    .select('student_id, score, total_marks, percentage, grade')
    .eq('exam_id', examId)

  const totalSubmissions = (results ?? []).length
  const allPercentages = (results ?? []).map((r: { percentage: number }) => r.percentage)

  // Grade distribution
  const gradeGroups = new Map<string, { count: number; min: number; max: number }>()
  for (const r of results ?? []) {
    const grade = r.grade ?? calculateGrade(r.percentage)
    const existing = gradeGroups.get(grade) ?? { count: 0, min: 100, max: 0 }
    existing.count += 1
    existing.min = Math.min(existing.min, r.percentage)
    existing.max = Math.max(existing.max, r.percentage)
    gradeGroups.set(grade, existing)
  }

  const gradeDistribution = Array.from(gradeGroups.entries())
    .map(([grade, data]) => ({
      grade,
      count: data.count,
      percentage: totalSubmissions > 0 ? Math.round(data.count / totalSubmissions * 100) : 0,
      minScore: data.min,
      maxScore: data.max,
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade))

  // Question analysis
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text')
    .eq('exam_id', examId)

  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('question_id, score, max_score')
    .eq('exam_id', examId)

  const questionSubmissions = new Map<string, { scores: number[]; maxScores: number[] }>()
  for (const s of submissions ?? []) {
    const existing = questionSubmissions.get(s.question_id) ?? { scores: [], maxScores: [] }
    existing.scores.push(s.score ?? 0)
    existing.maxScores.push(s.max_score)
    questionSubmissions.set(s.question_id, existing)
  }

  // Sort students by total score for discrimination calculation
  const sortedStudents = [...(results ?? [])].sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage)
  const topThird = sortedStudents.slice(0, Math.ceil(sortedStudents.length / 3))
  const bottomThird = sortedStudents.slice(-Math.ceil(sortedStudents.length / 3))
  const topIds = new Set(topThird.map((s: { student_id: string }) => s.student_id))
  const bottomIds = new Set(bottomThird.map((s: { student_id: string }) => s.student_id))

  const questionAnalysis = (questions ?? []).map((q: { id: string; text: string | null }) => {
    const qSubs = questionSubmissions.get(q.id) ?? { scores: [], maxScores: [] }
    const totalMaxScore = qSubs.maxScores.reduce((a: number, b: number) => a + b, 0)
    const totalScore = qSubs.scores.reduce((a: number, b: number) => a + b, 0)
    const difficulty = totalMaxScore > 0 ? Math.round(totalScore / totalMaxScore * 100) : 0
    const avgScore = qSubs.scores.length > 0 ? Math.round(totalScore / qSubs.scores.length * 10) / 10 : 0

    // Discrimination: difference in performance between top and bottom students
    const topSubs = (submissions ?? []).filter((s: { question_id: string; score: number | null }) => s.question_id === q.id && topIds.has((s as unknown as { student_id: string }).student_id))
    const bottomSubs = (submissions ?? []).filter((s: { question_id: string; score: number | null }) => s.question_id === q.id && bottomIds.has((s as unknown as { student_id: string }).student_id))
    const topAvg = topSubs.length > 0 ? topSubs.reduce((sum: number, s: { score: number | null }) => sum + (s.score ?? 0), 0) / topSubs.length : 0
    const bottomAvg = bottomSubs.length > 0 ? bottomSubs.reduce((sum: number, s: { score: number | null }) => sum + (s.score ?? 0), 0) / bottomSubs.length : 0
    const discrimination = Math.round((topAvg - bottomAvg) * 10) / 10

    return {
      questionId: q.id,
      questionText: q.text ?? '',
      difficulty,
      avgScore,
      discrimination,
    }
  })

  // Summary stats
  const sorted = [...allPercentages].sort((a, b) => a - b)
  const avgScore = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0
  const medianScore = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0
  const highestScore = sorted.length > 0 ? sorted[sorted.length - 1] : 0
  const lowestScore = sorted.length > 0 ? sorted[0] : 0
  const variance = sorted.length > 0
    ? sorted.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / sorted.length
    : 0
  const standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10
  const passRate = sorted.length > 0 ? Math.round(sorted.filter(s => s >= 50).length / sorted.length * 100) : 0

  // Item analysis
  const easyQuestions = questionAnalysis.filter(q => q.difficulty > 70).length
  const hardQuestions = questionAnalysis.filter(q => q.difficulty < 30).length
  const mediumQuestions = questionAnalysis.length - easyQuestions - hardQuestions

  return {
    examId,
    examTitle: exam.title,
    subjectName: subjectRes.data?.name ?? 'Unknown',
    className: classRes.data?.name ?? 'Unknown',
    totalMarks: exam.total_marks,
    duration: exam.duration,
    examType: exam.exam_type ?? 'cbt',
    status: exam.status,
    scheduledAt: exam.scheduled_at,
    totalSubmissions,
    gradeDistribution,
    questionAnalysis,
    summaryStats: {
      avgScore,
      medianScore,
      highestScore,
      lowestScore,
      standardDeviation,
      passRate,
      passMark: 50,
    },
    itemAnalysis: {
      totalQuestions: questionAnalysis.length,
      easyQuestions,
      mediumQuestions,
      hardQuestions,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}
