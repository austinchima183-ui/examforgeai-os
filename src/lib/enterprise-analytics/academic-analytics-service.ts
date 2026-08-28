// ============================================================================
// ExamForge AI — Academic Analytics Service
// ============================================================================
// Provides comprehensive academic analytics for executive dashboards,
// including performance metrics, pass/fail analysis, score distributions,
// subject comparisons, and performance trends.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type AcademicAnalytics,
  type SubjectPerformance,
  type ClassComparison,
  type PassFailAnalysis,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  type ScoreBucket,
  type RankedItem,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main Academic Analytics
// ──────────────────────────────────────────────────────────────

export async function getAcademicAnalytics(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<AcademicAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Fetch exam results within the period
  const { data: results } = await supabase
    .from('exam_results')
    .select('id, score_percentage, total_marks, student_id, exam_id, created_at, exams(subject_id, class_id, title)')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const resultRows = results ?? []

  // Calculate core metrics
  const scores = resultRows.map(r => {
    const total = r.total_marks ?? 100
    return total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
  })

  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0

  const passThreshold = 50
  const passCount = scores.filter(s => s >= passThreshold).length
  const failCount = scores.length - passCount
  const passRate = scores.length > 0 ? (passCount / scores.length) * 100 : 0
  const failRate = scores.length > 0 ? (failCount / scores.length) * 100 : 0

  // GPA approximation (on 4.0 scale)
  const avgGPA = scores.length > 0
    ? scores.reduce((sum, s) => {
        if (s >= 70) return sum + 4.0
        if (s >= 60) return sum + 3.0
        if (s >= 50) return sum + 2.0
        if (s >= 40) return sum + 1.0
        return sum + 0.0
      }, 0) / scores.length
    : 0

  // Exam completion rate
  const { data: exams } = await supabase
    .from('exams')
    .select('id, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const examRows = exams ?? []
  const completedExams = examRows.filter(e => e.status === 'completed' || e.status === 'graded').length
  const examCompletionRate = examRows.length > 0 ? (completedExams / examRows.length) * 100 : 0

  // Score distribution
  const scoreDistribution = buildScoreDistribution(scores)

  // Top performing students
  const topPerformingStudents = await getTopPerformingStudents(orgId, 10)

  // Subject performance
  const subjectsPerformance = await getSubjectPerformance(orgId, period, custom)

  // Class comparison
  const classComparison = await getClassComparison(orgId, period, custom)

  return {
    avgGPA,
    passRate,
    failRate,
    examCompletionRate,
    avgScore,
    scoreDistribution,
    topPerformingStudents,
    subjectsPerformance,
    classComparison,
  }
}

// ──────────────────────────────────────────────────────────────
// Subject Performance
// ──────────────────────────────────────────────────────────────

export async function getSubjectPerformance(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<SubjectPerformance[]> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, student_id, created_at, exams(subject_id, subjects(id, name))')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const resultRows = results ?? []

  // Group by subject
  const subjectMap: Record<string, { name: string; scores: number[]; students: Set<string> }> = {}

  for (const r of resultRows) {
    const exam = r.exams as unknown as { subject_id: string | null; subjects: { id: string; name: string } | null } | null
    if (!exam?.subject_id) continue

    const subjectId = exam.subject_id
    const subjectName = exam.subjects?.name ?? 'Unknown'

    if (!subjectMap[subjectId]) {
      subjectMap[subjectId] = { name: subjectName, scores: [], students: new Set<string>() }
    }

    const total = r.total_marks ?? 100
    const pct = total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
    subjectMap[subjectId].scores.push(pct)
    if (r.student_id) subjectMap[subjectId].students.add(r.student_id)
  }

  return Object.entries(subjectMap).map(([subjectId, data]) => {
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      : 0
    const passCount = data.scores.filter(s => s >= 50).length

    return {
      subjectId,
      subjectName: data.name,
      avgScore,
      passRate: data.scores.length > 0 ? (passCount / data.scores.length) * 100 : 0,
      failRate: data.scores.length > 0 ? ((data.scores.length - passCount) / data.scores.length) * 100 : 0,
      totalStudents: data.students.size,
      trend: [],
    }
  }).sort((a, b) => b.avgScore - a.avgScore)
}

// ──────────────────────────────────────────────────────────────
// Class Comparison
// ──────────────────────────────────────────────────────────────

export async function getClassComparison(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<ClassComparison[]> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, student_id, exams(class_id, classes(id, name))')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const resultRows = results ?? []

  // Group by class
  const classMap: Record<string, { name: string; scores: number[]; students: Set<string> }> = {}

  for (const r of resultRows) {
    const exam = r.exams as unknown as { class_id: string | null; classes: { id: string; name: string } | null } | null
    if (!exam?.class_id) continue

    const classId = exam.class_id
    const className = exam.classes?.name ?? 'Unknown'

    if (!classMap[classId]) {
      classMap[classId] = { name: className, scores: [], students: new Set<string>() }
    }

    const total = r.total_marks ?? 100
    const pct = total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
    classMap[classId].scores.push(pct)
    if (r.student_id) classMap[classId].students.add(r.student_id)
  }

  return Object.entries(classMap).map(([classId, data]) => {
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      : 0
    const passCount = data.scores.filter(s => s >= 50).length

    return {
      classId,
      className: data.name,
      avgScore,
      passRate: data.scores.length > 0 ? (passCount / data.scores.length) * 100 : 0,
      studentCount: data.students.size,
      topScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
      bottomScore: data.scores.length > 0 ? Math.min(...data.scores) : 0,
    }
  }).sort((a, b) => b.avgScore - a.avgScore)
}

// ──────────────────────────────────────────────────────────────
// Score Distribution
// ──────────────────────────────────────────────────────────────

export async function getScoreDistribution(
  orgId: string,
  examId?: string
): Promise<ScoreBucket[]> {
  const supabase = await createClient()

  let query = supabase
    .from('exam_results')
    .select('score_percentage, total_marks')

  if (examId) {
    query = query.eq('exam_id', examId)
  }

  const { data: results } = await query
  const resultRows = results ?? []

  const scores = resultRows.map(r => {
    const total = r.total_marks ?? 100
    return total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
  })

  return buildScoreDistribution(scores)
}

// ──────────────────────────────────────────────────────────────
// Top Performing Students
// ──────────────────────────────────────────────────────────────

export async function getTopPerformingStudents(
  orgId: string,
  limit: number = 10
): Promise<RankedItem[]> {
  const supabase = await createClient()

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, student_id, profiles(id, full_name)')

  const resultRows = results ?? []

  // Aggregate by student
  const studentMap: Record<string, { name: string; scores: number[] }> = {}

  for (const r of resultRows) {
    if (!r.student_id) continue

    const profile = r.profiles as unknown as { id: string; full_name: string | null } | null
    const name = profile?.full_name ?? 'Unknown Student'

    if (!studentMap[r.student_id]) {
      studentMap[r.student_id] = { name, scores: [] }
    }

    const total = r.total_marks ?? 100
    const pct = total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
    studentMap[r.student_id].scores.push(pct)
  }

  return Object.entries(studentMap)
    .map(([id, data]) => ({
      id,
      name: data.name,
      rank: 0,
      score: data.scores.length > 0
        ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length
        : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

// ──────────────────────────────────────────────────────────────
// Pass/Fail Analysis
// ──────────────────────────────────────────────────────────────

export async function getPassFailAnalysis(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<PassFailAnalysis> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, student_id, exam_id, exams(subject_id, class_id, subjects(name), classes(name))')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const resultRows = results ?? []

  const scores = resultRows.map(r => {
    const total = r.total_marks ?? 100
    return total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
  })

  const passCount = scores.filter(s => s >= 50).length
  const failCount = scores.length - passCount

  // Unique students and exams
  const studentIds = new Set(resultRows.map(r => r.student_id).filter(Boolean))
  const examIds = new Set(resultRows.map(r => r.exam_id).filter(Boolean))

  // By subject
  const subjectMap: Record<string, { pass: number; fail: number }> = {}
  for (let i = 0; i < resultRows.length; i++) {
    const r = resultRows[i]
    const exam = r.exams as unknown as { subjects: { name: string } | null } | null
    const subject = exam?.subjects?.name ?? 'Unknown'
    if (!subjectMap[subject]) subjectMap[subject] = { pass: 0, fail: 0 }
    if (scores[i] >= 50) subjectMap[subject].pass++
    else subjectMap[subject].fail++
  }

  const bySubject = Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    passRate: (data.pass + data.fail) > 0 ? (data.pass / (data.pass + data.fail)) * 100 : 0,
    failRate: (data.pass + data.fail) > 0 ? (data.fail / (data.pass + data.fail)) * 100 : 0,
  }))

  // By class
  const classMap: Record<string, { pass: number; fail: number }> = {}
  for (let i = 0; i < resultRows.length; i++) {
    const r = resultRows[i]
    const exam = r.exams as unknown as { classes: { name: string } | null } | null
    const className = exam?.classes?.name ?? 'Unknown'
    if (!classMap[className]) classMap[className] = { pass: 0, fail: 0 }
    if (scores[i] >= 50) classMap[className].pass++
    else classMap[className].fail++
  }

  const byClass = Object.entries(classMap).map(([className, data]) => ({
    className,
    passRate: (data.pass + data.fail) > 0 ? (data.pass / (data.pass + data.fail)) * 100 : 0,
    failRate: (data.pass + data.fail) > 0 ? (data.fail / (data.pass + data.fail)) * 100 : 0,
  }))

  return {
    totalExams: examIds.size,
    totalStudents: studentIds.size,
    passCount,
    failCount,
    passRate: scores.length > 0 ? (passCount / scores.length) * 100 : 0,
    failRate: scores.length > 0 ? (failCount / scores.length) * 100 : 0,
    bySubject,
    byClass,
  }
}

// ──────────────────────────────────────────────────────────────
// Performance Trend
// ──────────────────────────────────────────────────────────────

export async function getPerformanceTrend(
  orgId: string,
  months: number = 12
): Promise<TimeSeriesPoint[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, created_at')
    .gte('created_at', startDate.toISOString())

  const resultRows = results ?? []

  // Group by month
  const monthly: Record<string, { total: number; count: number }> = {}
  for (const r of resultRows) {
    if (!r.created_at) continue
    const monthKey = r.created_at.slice(0, 7)
    if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0 }

    const max = r.total_marks ?? 100
    const pct = max > 0 ? ((r.score_percentage ?? 0) / max) * 100 : 0
    monthly[monthKey].total += pct
    monthly[monthKey].count++
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: data.count > 0 ? data.total / data.count : 0,
    }))
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function buildScoreDistribution(scores: number[]): ScoreBucket[] {
  const buckets: ScoreBucket[] = [
    { range: '0-9', min: 0, max: 9, count: 0 },
    { range: '10-19', min: 10, max: 19, count: 0 },
    { range: '20-29', min: 20, max: 29, count: 0 },
    { range: '30-39', min: 30, max: 39, count: 0 },
    { range: '40-49', min: 40, max: 49, count: 0 },
    { range: '50-59', min: 50, max: 59, count: 0 },
    { range: '60-69', min: 60, max: 69, count: 0 },
    { range: '70-79', min: 70, max: 79, count: 0 },
    { range: '80-89', min: 80, max: 89, count: 0 },
    { range: '90-100', min: 90, max: 100, count: 0 },
  ]

  for (const score of scores) {
    const bucketIndex = Math.min(Math.floor(score / 10), 9)
    buckets[bucketIndex].count++
  }

  return buckets
}
