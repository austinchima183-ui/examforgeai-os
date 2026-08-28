// ============================================================================
// ExamForge AI — Enrollment Analytics Service
// ============================================================================
// Provides enrollment analytics including trends, retention rates,
// demographic breakdowns, enrollment projections, and withdrawal analysis.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import {
  type EnrollmentAnalytics,
  type EnrollmentTrend,
  type RetentionData,
  type EnrollmentProjection,
  type DemographicBreakdown,
  type WithdrawalAnalysis,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  type PercentageBreakdown,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main Enrollment Analytics
// ──────────────────────────────────────────────────────────────

export async function getEnrollmentAnalytics(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<EnrollmentAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Current enrollment count
  const { count: currentEnrollment } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')

  // New enrollments in the period
  const { count: newEnrollments } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Withdrawals in the period
  const { data: withdrawals } = await supabase
    .from('enrollment_history')
    .select('id, action, created_at')
    .eq('school_id', orgId)
    .eq('action', 'withdrawal')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const withdrawalCount = (withdrawals ?? []).length

  // Retention rate
  const retentionData = await getRetentionRate(orgId, period, custom)

  // Projections by grade
  const projectionsByGrade = await getProjectionsByGrade(orgId)

  // Projections by department
  const projectionsByDepartment = await getProjectionsByDepartment(orgId)

  return {
    currentEnrollment: currentEnrollment ?? 0,
    newEnrollments: newEnrollments ?? 0,
    withdrawals: withdrawalCount,
    retentionRate: retentionData.overallRate,
    projectionsByGrade,
    projectionsByDepartment,
  }
}

// ──────────────────────────────────────────────────────────────
// Enrollment Trend
// ──────────────────────────────────────────────────────────────

export async function getEnrollmentTrend(
  orgId: string,
  months: number = 12
): Promise<EnrollmentTrend> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Get enrollment history
  const { data: history } = await supabase
    .from('enrollment_history')
    .select('action, created_at')
    .eq('school_id', orgId)
    .gte('created_at', startDate.toISOString())

  const historyRows = history ?? []

  // Build monthly trend
  const monthly: Record<string, number> = {}

  // Start with current count
  const { count: currentCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')

  // Process history to build monthly enrollment counts
  for (const h of historyRows) {
    if (!h.created_at) continue
    const monthKey = h.created_at.slice(0, 7)
    if (!monthly[monthKey]) monthly[monthKey] = 0

    if (h.action === 'enrollment' || h.action === 'new') monthly[monthKey]++
    else if (h.action === 'withdrawal') monthly[monthKey]--
  }

  // Build cumulative trend
  const sortedMonths = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b))
  let runningTotal = (currentCount ?? 0)
  const monthsData: TimeSeriesPoint[] = []

  // Work backwards from current
  for (let i = sortedMonths.length - 1; i >= 0; i--) {
    const [date, change] = sortedMonths[i]
    monthsData.unshift({ date, value: runningTotal })
    runningTotal -= change
  }

  // Calculate growth rate
  const growthRate = monthsData.length >= 2
    ? ((monthsData[monthsData.length - 1].value - monthsData[0].value) / Math.max(1, monthsData[0].value)) * 100
    : 0

  // Seasonal patterns (by month of year)
  const seasonalMap: Record<number, number[]> = {}
  for (const m of monthsData) {
    const monthNum = new Date(m.date).getMonth() + 1
    if (!seasonalMap[monthNum]) seasonalMap[monthNum] = []
    seasonalMap[monthNum].push(m.value)
  }

  const seasonalPatterns = Object.entries(seasonalMap).map(([month, values]) => ({
    month,
    avgEnrollment: values.reduce((s, v) => s + v, 0) / values.length,
  })).sort((a, b) => parseInt(a.month) - parseInt(b.month))

  return {
    months: monthsData,
    growthRate,
    seasonalPatterns,
  }
}

// ──────────────────────────────────────────────────────────────
// Retention Rate
// ──────────────────────────────────────────────────────────────

export async function getRetentionRate(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<RetentionData> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Count students who were enrolled at start and still enrolled at end
  const { data: startStudents } = await supabase
    .from('users')
    .select('id, grade, department')
    .eq('school_id', orgId)
    .eq('role', 'student')
    .lte('created_at', startDate)

  const startRows = startStudents ?? []

  // Students who withdrew during the period
  const { data: withdrawals } = await supabase
    .from('enrollment_history')
    .select('student_id, created_at')
    .eq('school_id', orgId)
    .eq('action', 'withdrawal')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const withdrawnIds = new Set((withdrawals ?? []).map(w => w.student_id))

  // Retained = start students who haven't withdrawn
  const retainedCount = startRows.filter(s => !withdrawnIds.has(s.id)).length
  const overallRate = startRows.length > 0 ? (retainedCount / startRows.length) * 100 : 100

  // By grade
  const gradeMap: Record<string, { retained: number; total: number }> = {}
  for (const s of startRows) {
    const grade = (s as { grade?: string | null }).grade ?? 'Unknown'
    if (!gradeMap[grade]) gradeMap[grade] = { retained: 0, total: 0 }
    gradeMap[grade].total++
    if (!withdrawnIds.has(s.id)) gradeMap[grade].retained++
  }

  const byGrade = Object.entries(gradeMap).map(([grade, data]) => ({
    grade,
    retained: data.retained,
    total: data.total,
    rate: data.total > 0 ? (data.retained / data.total) * 100 : 0,
  }))

  // By department
  const deptMap: Record<string, { retained: number; total: number }> = {}
  for (const s of startRows) {
    const dept = (s as { department?: string | null }).department ?? 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { retained: 0, total: 0 }
    deptMap[dept].total++
    if (!withdrawnIds.has(s.id)) deptMap[dept].retained++
  }

  const byDepartment = Object.entries(deptMap).map(([department, data]) => ({
    department,
    retained: data.retained,
    total: data.total,
    rate: data.total > 0 ? (data.retained / data.total) * 100 : 0,
  }))

  // Trend (simplified)
  const trend: TimeSeriesPoint[] = []

  return {
    overallRate,
    byGrade,
    byDepartment,
    trend,
  }
}

// ──────────────────────────────────────────────────────────────
// Enrollment Projections (AI-Powered)
// ──────────────────────────────────────────────────────────────

export async function getEnrollmentProjections(
  orgId: string,
  months: number = 6
): Promise<EnrollmentProjection[]> {
  const supabase = await createClient()

  // Get current enrollment and historical data
  const { count: currentEnrollment } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')

  const { data: history } = await supabase
    .from('enrollment_history')
    .select('action, created_at')
    .eq('school_id', orgId)

  const historyRows = history ?? []

  // Build monthly enrollment changes
  const monthlyChanges: Record<string, number> = {}
  for (const h of historyRows) {
    if (!h.created_at) continue
    const monthKey = h.created_at.slice(0, 7)
    if (!monthlyChanges[monthKey]) monthlyChanges[monthKey] = 0
    if (h.action === 'enrollment' || h.action === 'new') monthlyChanges[monthKey]++
    else if (h.action === 'withdrawal') monthlyChanges[monthKey]--
  }

  // Use AI for projection if we have data
  try {
    const historicalSummary = Object.entries(monthlyChanges)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, change]) => ({ month: date, netChange: change }))

    const response = await executeStructuredAI<EnrollmentProjection[]>(
      {
        prompt: `Based on current enrollment of ${currentEnrollment ?? 0} students and the following historical monthly enrollment changes, project enrollment for the next ${months} months by grade level.

Historical data: ${JSON.stringify(historicalSummary)}

Return a JSON array with objects: { label (grade name), current (number), projected (number), change (number), changePercent (number) }`,
        systemPrompt: 'You are an education analytics AI that projects enrollment. Consider seasonal patterns, growth trends, and typical academic calendar effects. Return valid JSON only.',
        userId: 'system',
        schoolId: orgId,
        temperature: 0.3,
      },
      (raw) => {
        if (Array.isArray(raw)) return raw as EnrollmentProjection[]
        return []
      }
    )

    if (response.parsed && response.parsed.length > 0) {
      return response.parsed
    }
  } catch {
    // Fall through to simple projection
  }

  // Fallback: simple linear projection
  const avgMonthlyChange = Object.values(monthlyChanges).length > 0
    ? Object.values(monthlyChanges).reduce((s, v) => s + v, 0) / Object.values(monthlyChanges).length
    : 0

  const current = currentEnrollment ?? 0
  const projected = current + avgMonthlyChange * months

  return [{
    label: 'Total',
    current,
    projected: Math.round(projected),
    change: Math.round(avgMonthlyChange * months),
    changePercent: current > 0 ? ((avgMonthlyChange * months) / current) * 100 : 0,
  }]
}

// ──────────────────────────────────────────────────────────────
// Demographic Breakdown
// ──────────────────────────────────────────────────────────────

export async function getDemographicBreakdown(
  orgId: string
): Promise<DemographicBreakdown> {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('users')
    .select('id, gender, date_of_birth, grade, department, city')
    .eq('school_id', orgId)
    .eq('role', 'student')

  const studentRows = (students ?? []) as Array<{
    id: string
    gender?: string | null
    date_of_birth?: string | null
    grade?: string | null
    department?: string | null
    city?: string | null
  }>

  const total = studentRows.length

  // By gender
  const genderMap: Record<string, number> = {}
  for (const s of studentRows) {
    const g = s.gender ?? 'Not specified'
    genderMap[g] = (genderMap[g] ?? 0) + 1
  }
  const byGender = toBreakdown(genderMap, total)

  // By age group
  const ageMap: Record<string, number> = {}
  for (const s of studentRows) {
    const age = s.date_of_birth ? calculateAge(s.date_of_birth) : null
    const group = age !== null
      ? age < 10 ? 'Under 10' : age < 13 ? '10-12' : age < 16 ? '13-15' : age < 19 ? '16-18' : '19+'
      : 'Unknown'
    ageMap[group] = (ageMap[group] ?? 0) + 1
  }
  const byAgeGroup = toBreakdown(ageMap, total)

  // By grade
  const gradeMap: Record<string, number> = {}
  for (const s of studentRows) {
    const g = s.grade ?? 'Unassigned'
    gradeMap[g] = (gradeMap[g] ?? 0) + 1
  }
  const byGrade = toBreakdown(gradeMap, total)

  // By department
  const deptMap: Record<string, number> = {}
  for (const s of studentRows) {
    const d = s.department ?? 'Unassigned'
    deptMap[d] = (deptMap[d] ?? 0) + 1
  }
  const byDepartment = toBreakdown(deptMap, total)

  // By location
  const locMap: Record<string, number> = {}
  for (const s of studentRows) {
    const l = s.city ?? 'Unknown'
    locMap[l] = (locMap[l] ?? 0) + 1
  }
  const byLocation = toBreakdown(locMap, total)

  return { byGender, byAgeGroup, byGrade, byDepartment, byLocation }
}

// ──────────────────────────────────────────────────────────────
// Withdrawal Analysis
// ──────────────────────────────────────────────────────────────

export async function getWithdrawalAnalysis(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<WithdrawalAnalysis> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  const { data: withdrawals } = await supabase
    .from('enrollment_history')
    .select('student_id, reason, created_at, profiles(grade)')
    .eq('school_id', orgId)
    .eq('action', 'withdrawal')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const withdrawalRows = (withdrawals ?? []) as Array<{
    student_id: string
    reason?: string | null
    created_at: string | null
    profiles: { grade?: string | null } | null
  }>

  // Total current students for rate calculation
  const { count: totalStudents } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')

  const totalWithdrawals = withdrawalRows.length
  const withdrawalRate = (totalStudents ?? 0) > 0
    ? (totalWithdrawals / (totalStudents ?? 1)) * 100
    : 0

  // By reason
  const reasonMap: Record<string, number> = {}
  for (const w of withdrawalRows) {
    const r = w.reason ?? 'Not specified'
    reasonMap[r] = (reasonMap[r] ?? 0) + 1
  }
  const byReason = toBreakdown(reasonMap, totalWithdrawals)

  // By grade
  const gradeMap: Record<string, number> = {}
  for (const w of withdrawalRows) {
    const g = w.profiles?.grade ?? 'Unknown'
    gradeMap[g] = (gradeMap[g] ?? 0) + 1
  }
  const byGrade = toBreakdown(gradeMap, totalWithdrawals)

  // By month
  const monthly: Record<string, number> = {}
  for (const w of withdrawalRows) {
    if (!w.created_at) continue
    const monthKey = w.created_at.slice(0, 7)
    monthly[monthKey] = (monthly[monthKey] ?? 0) + 1
  }
  const byMonth = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))

  // Average time to withdrawal (from enrollment to withdrawal)
  const avgTimeToWithdrawal = 0 // Would need enrollment date per student

  return {
    totalWithdrawals,
    withdrawalRate,
    byReason,
    byGrade,
    byMonth,
    avgTimeToWithdrawal,
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function toBreakdown(
  map: Record<string, number>,
  total: number
): PercentageBreakdown[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
}

function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

async function getProjectionsByGrade(orgId: string): Promise<EnrollmentProjection[]> {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('users')
    .select('grade')
    .eq('school_id', orgId)
    .eq('role', 'student')

  const rows = (students ?? []) as Array<{ grade?: string | null }>
  const gradeMap: Record<string, number> = {}
  for (const s of rows) {
    const g = s.grade ?? 'Unassigned'
    gradeMap[g] = (gradeMap[g] ?? 0) + 1
  }

  return Object.entries(gradeMap).map(([label, current]) => ({
    label,
    current,
    projected: Math.round(current * 1.05), // 5% growth projection
    change: Math.round(current * 0.05),
    changePercent: 5,
  }))
}

async function getProjectionsByDepartment(orgId: string): Promise<EnrollmentProjection[]> {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('users')
    .select('department')
    .eq('school_id', orgId)
    .eq('role', 'student')

  const rows = (students ?? []) as Array<{ department?: string | null }>
  const deptMap: Record<string, number> = {}
  for (const s of rows) {
    const d = s.department ?? 'Unassigned'
    deptMap[d] = (deptMap[d] ?? 0) + 1
  }

  return Object.entries(deptMap).map(([label, current]) => ({
    label,
    current,
    projected: Math.round(current * 1.05),
    change: Math.round(current * 0.05),
    changePercent: 5,
  }))
}
