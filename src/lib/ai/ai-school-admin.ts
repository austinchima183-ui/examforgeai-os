// ============================================================================
// ExamForge AI School Admin — Intelligent School Management
// ============================================================================
// Production-ready AI-powered workflows for school administrators:
// - Staffing recommendations
// - Enrollment forecasting
// - Revenue forecasting
// - Risk detection
// - Attendance prediction
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI, getSystemPrompt } from './ai-engine'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface StaffingRequest {
  schoolId: string
  schoolName: string
  currentTeachers: number
  currentStudents: number
  subjectsOffered: string[]
  teacherStudentRatio?: number
  upcomingTerm?: string
}

export interface StaffingResponse {
  currentRatio: number
  recommendedRatio: number
  additionalTeachersNeeded: number
  subjectGaps: Array<{ subject: string; currentTeachers: number; needed: number; priority: 'low' | 'medium' | 'high' }>
  hiringTimeline: string
  budgetEstimate: string
  recommendations: string[]
}

export interface EnrollmentForecastRequest {
  schoolId: string
  schoolName: string
  historicalData?: Array<{ year: string; enrollment: number }>
  capacity: number
  currentEnrollment: number
  localTrends?: string
}

export interface EnrollmentForecastResponse {
  currentEnrollment: number
  capacity: number
  utilizationPercent: number
  forecast: Array<{ term: string; projectedEnrollment: number; confidence: number }>
  trendAnalysis: string
  recommendations: string[]
  capacityAlert: 'none' | 'approaching' | 'near_capacity' | 'over_capacity'
}

export interface RevenueForecastRequest {
  schoolId: string
  schoolName: string
  currentRevenue: number
  feeStructure: Array<{ type: string; amount: number; studentCount: number }>
  pendingFees: number
  overdueFees: number
  historicalRevenue?: Array<{ month: string; amount: number }>
}

export interface RevenueForecastResponse {
  currentRevenue: number
  projectedAnnual: number
  collectionRate: number
  forecast: Array<{ month: string; projected: number; lower: number; upper: number }>
  riskAreas: string[]
  recommendations: string[]
  overdueAction: string[]
}

export interface RiskDetectionRequest {
  schoolId: string
  schoolName: string
}

export interface RiskDetectionResponse {
  overallRiskScore: number
  risks: Array<{
    category: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    affectedCount: number
    recommendation: string
  }>
  atRiskStudents: Array<{ id: string; name: string; risk: string; action: string }>
  teacherBurnoutRisk: Array<{ id: string; name: string; factors: string[] }>
  quickWins: string[]
}

export interface AttendancePredictionRequest {
  schoolId: string
  schoolName: string
  daysToPredict: number
}

export interface AttendancePredictionResponse {
  overallRate: number
  predictions: Array<{ date: string; predictedRate: number; factors: string[] }>
  patterns: {
    dayOfWeek: Record<string, number>
    monthly: Record<string, number>
  }
  chronicAbsentees: Array<{ studentId: string; name: string; rate: number; intervention: string }>
  recommendations: string[]
}

// ──────────────────────────────────────────────────────────────
// Staffing Recommendations
// ──────────────────────────────────────────────────────────────

export async function getStaffingRecommendations(
  request: StaffingRequest,
  userId: string,
  schoolId?: string | null
): Promise<StaffingResponse> {
  const supabase = await createClient()

  // Fetch real teacher data
  const { data: teachers } = await supabase
    .from('users')
    .select('id, full_name, metadata')
    .eq('school_id', request.schoolId)
    .eq('role', 'teacher')
    .eq('is_active', true)

  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('school_id', request.schoolId)
    .eq('role', 'student')
    .eq('is_active', true)

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('school_id', request.schoolId)
    .eq('is_active', true)

  const actualTeachers = teachers?.length ?? request.currentTeachers
  const actualStudents = students?.length ?? request.currentStudents
  const actualSubjects = subjects?.map((s) => s.name) ?? request.subjectsOffered

  const prompt = `Analyze staffing needs for this school:

School: ${request.schoolName}
Current Teachers: ${actualTeachers}
Current Students: ${actualStudents}
Current Ratio: 1:${actualTeachers > 0 ? Math.round(actualStudents / actualTeachers) : 'N/A'}
Subjects Offered: ${actualSubjects.join(', ')}
${request.upcomingTerm ? `Upcoming Term: ${request.upcomingTerm}` : ''}

Teacher Details:
${teachers?.map((t) => `- ${t.full_name}${t.metadata ? ` (${JSON.stringify(t.metadata)})` : ''}`).join('\n') ?? 'No detailed teacher data'}

Analyze:
1. Current student-teacher ratio vs recommended (1:25 for secondary, 1:20 for primary)
2. Subject coverage gaps (subjects without dedicated teachers)
3. How many additional teachers needed
4. Priority subjects for hiring
5. Timeline for recruitment
6. Budget considerations

Respond as JSON matching the StaffingResponse structure.`

  const response = await executeStructuredAI<StaffingResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Staffing'),
      userId,
      schoolId,
      metadata: { type: 'staffing_analysis', schoolId: request.schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        currentRatio: data.currentRatio ?? (actualTeachers > 0 ? actualStudents / actualTeachers : 0),
        recommendedRatio: data.recommendedRatio ?? 25,
        additionalTeachersNeeded: data.additionalTeachersNeeded ?? 0,
        subjectGaps: data.subjectGaps ?? [],
        hiringTimeline: data.hiringTimeline ?? '',
        budgetEstimate: data.budgetEstimate ?? '',
        recommendations: data.recommendations ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Enrollment Forecasting
// ──────────────────────────────────────────────────────────────

export async function forecastEnrollment(
  request: EnrollmentForecastRequest,
  userId: string,
  schoolId?: string | null
): Promise<EnrollmentForecastResponse> {
  const supabase = await createClient()

  // Fetch real enrollment data over time
  const { data: currentStudents } = await supabase
    .from('users')
    .select('id, created_at')
    .eq('school_id', request.schoolId)
    .eq('role', 'student')
    .eq('is_active', true)

  const { data: school } = await supabase
    .from('schools')
    .select('metadata')
    .eq('id', request.schoolId)
    .single()

  const schoolMeta = school?.metadata as Record<string, unknown> | null
  const capacity = (schoolMeta?.capacity as number) ?? request.capacity
  const currentEnrollment = currentStudents?.length ?? request.currentEnrollment

  // Build monthly enrollment counts
  const monthlyCounts: Record<string, number> = {}
  for (const student of currentStudents ?? []) {
    const month = student.created_at.substring(0, 7)
    monthlyCounts[month] = (monthlyCounts[month] ?? 0) + 1
  }

  const prompt = `Forecast enrollment for this school:

School: ${request.schoolName}
Current Enrollment: ${currentEnrollment}
Capacity: ${capacity}
Utilization: ${((currentEnrollment / capacity) * 100).toFixed(1)}%

Enrollment History (monthly new enrollments):
${Object.entries(monthlyCounts).map(([month, count]) => `- ${month}: ${count} new students`).join('\n') || 'Limited historical data'}

${request.historicalData?.length ? `Historical Annual Data: ${request.historicalData.map(h => `${h.year}: ${h.enrollment}`).join(', ')}` : ''}
${request.localTrends ? `Local Demographic Trends: ${request.localTrends}` : ''}

Provide:
1. Current utilization percentage
2. Term-by-term forecast for next 3 terms with confidence levels
3. Trend analysis (growing, stable, declining)
4. Capacity alert level
5. Recommendations (expansion, marketing, retention)

Respond as JSON matching the EnrollmentForecastResponse structure.`

  const response = await executeStructuredAI<EnrollmentForecastResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Enrollment'),
      userId,
      schoolId,
      metadata: { type: 'enrollment_forecast', schoolId: request.schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        currentEnrollment,
        capacity,
        utilizationPercent: (currentEnrollment / capacity) * 100,
        forecast: data.forecast ?? [],
        trendAnalysis: data.trendAnalysis ?? '',
        recommendations: data.recommendations ?? [],
        capacityAlert: data.capacityAlert ?? 'none',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Revenue Forecasting
// ──────────────────────────────────────────────────────────────

export async function forecastRevenue(
  request: RevenueForecastRequest,
  userId: string,
  schoolId?: string | null
): Promise<RevenueForecastResponse> {
  const supabase = await createClient()

  // Fetch real fee and payment data
  const [feesResult, paymentsResult] = await Promise.all([
    supabase
      .from('fee_assignments')
      .select('id, amount_due, amount_paid, status, due_date')
      .eq('student_id', request.schoolId) // This would be school-scoped via RLS
      .order('due_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, amount, status, created_at')
      .eq('school_id', request.schoolId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const fees = feesResult.data ?? []
  const payments = paymentsResult.data ?? []

  const totalFeesDue = fees.reduce((sum, f) => sum + f.amount_due, 0)
  const totalFeesPaid = fees.reduce((sum, f) => sum + f.amount_paid, 0)
  const overdueFees = fees.filter((f) => f.status === 'overdue').reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0)
  const collectionRate = totalFeesDue > 0 ? totalFeesPaid / totalFeesDue : 1

  const prompt = `Analyze and forecast revenue for this school:

School: ${request.schoolName}
Total Fees Assigned: ${totalFeesDue.toLocaleString()}
Total Fees Collected: ${totalFeesPaid.toLocaleString()}
Collection Rate: ${(collectionRate * 100).toFixed(1)}%
Overdue Fees: ${overdueFees.toLocaleString()}

Recent Payments:
${payments.slice(0, 20).map((p) => `- ${p.amount.toLocaleString()} (${p.status}) on ${p.created_at}`).join('\n') || 'No recent payments'}

${request.historicalRevenue?.length ? `Historical Revenue: ${request.historicalRevenue.map(h => `${h.month}: ${h.amount.toLocaleString()}`).join(', ')}` : ''}

Provide:
1. Monthly revenue forecast for next 6 months with confidence bands
2. Collection rate analysis
3. Risk areas (overdue patterns, seasonal dips)
4. Revenue optimization recommendations
5. Specific actions for overdue collections

Respond as JSON matching the RevenueForecastResponse structure.`

  const response = await executeStructuredAI<RevenueForecastResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Revenue'),
      userId,
      schoolId,
      metadata: { type: 'revenue_forecast', schoolId: request.schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        currentRevenue: data.currentRevenue ?? totalFeesPaid,
        projectedAnnual: data.projectedAnnual ?? 0,
        collectionRate: data.collectionRate ?? collectionRate,
        forecast: data.forecast ?? [],
        riskAreas: data.riskAreas ?? [],
        recommendations: data.recommendations ?? [],
        overdueAction: data.overdueAction ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Risk Detection
// ──────────────────────────────────────────────────────────────

export async function detectSchoolRisks(
  request: RiskDetectionRequest,
  userId: string,
  schoolId?: string | null
): Promise<RiskDetectionResponse> {
  const supabase = await createClient()

  // Gather comprehensive school data for risk analysis
  const [studentsResult, teachersResult, attendanceResult, sessionsResult, feesResult] = await Promise.all([
    supabase.from('users').select('id, full_name').eq('school_id', request.schoolId).eq('role', 'student').eq('is_active', true),
    supabase.from('users').select('id, full_name').eq('school_id', request.schoolId).eq('role', 'teacher').eq('is_active', true),
    supabase.from('attendance').select('student_id, status, date').eq('school_id', request.schoolId).order('date', { ascending: false }).limit(500),
    supabase.from('exam_sessions').select('student_id, percentage, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('fee_assignments').select('student_id, amount_due, amount_paid, status').eq('status', 'overdue'),
  ])

  const students = studentsResult.data ?? []
  const teachers = teachersResult.data ?? []
  const attendance = attendanceResult.data ?? []
  const sessions = sessionsResult.data ?? []
  const overdueFees = feesResult.data ?? []

  // Calculate real metrics
  const avgPerformance = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / sessions.length
    : 50

  const studentAttendanceMap = new Map<string, { present: number; total: number }>()
  for (const a of attendance) {
    const current = studentAttendanceMap.get(a.student_id) ?? { present: 0, total: 0 }
    current.total++
    if (a.status === 'present') current.present++
    studentAttendanceMap.set(a.student_id, current)
  }

  const chronicAbsentees = Array.from(studentAttendanceMap.entries())
    .filter(([, v]) => v.total > 0 && v.present / v.total < 0.85)
    .map(([id, v]) => {
      const student = students.find((s) => s.id === id)
      return { id, name: student?.full_name ?? 'Unknown', rate: v.present / v.total }
    })

  const prompt = `Comprehensive risk analysis for:

School: ${request.schoolName}
Total Students: ${students.length}
Total Teachers: ${teachers.length}
Average Exam Performance: ${avgPerformance.toFixed(1)}%
Chronic Absentees (< 85% attendance): ${chronicAbsentees.length} students
Overdue Fee Assignments: ${overdueFees.length}

Chronic Absentee Details:
${chronicAbsentees.slice(0, 20).map((s) => `- ${s.name}: ${(s.rate * 100).toFixed(1)}% attendance`).join('\n')}

Student Performance Distribution:
- Below 40%: ${sessions.filter(s => (s.percentage ?? 0) < 40).length} students
- 40-60%: ${sessions.filter(s => (s.percentage ?? 0) >= 40 && (s.percentage ?? 0) < 60).length} students
- 60-80%: ${sessions.filter(s => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80).length} students
- Above 80%: ${sessions.filter(s => (s.percentage ?? 0) >= 80).length} students

Identify:
1. Overall risk score (0-100)
2. Categorized risks (academic, attendance, financial, staffing, compliance)
3. At-risk students with specific interventions
4. Teachers showing burnout risk (heavy workload, many struggling students)
5. Quick wins that can be implemented immediately

Respond as JSON matching the RiskDetectionResponse structure.`

  const response = await executeStructuredAI<RiskDetectionResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Risk Detection'),
      userId,
      schoolId,
      metadata: { type: 'risk_detection', schoolId: request.schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        overallRiskScore: Math.min(Math.max(data.overallRiskScore ?? 50, 0), 100),
        risks: data.risks ?? [],
        atRiskStudents: data.atRiskStudents ?? [],
        teacherBurnoutRisk: data.teacherBurnoutRisk ?? [],
        quickWins: data.quickWins ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Attendance Prediction
// ──────────────────────────────────────────────────────────────

export async function predictAttendance(
  request: AttendancePredictionRequest,
  userId: string,
  schoolId?: string | null
): Promise<AttendancePredictionResponse> {
  const supabase = await createClient()

  // Fetch real attendance patterns
  const { data: attendance } = await supabase
    .from('attendance')
    .select('student_id, status, date, class_id')
    .eq('school_id', request.schoolId)
    .order('date', { ascending: false })
    .limit(2000)

  const records = attendance ?? []

  // Build day-of-week patterns
  const dayOfWeekMap: Record<string, { present: number; total: number }> = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const r of records) {
    const day = dayNames[new Date(r.date).getDay()]
    const current = dayOfWeekMap[day] ?? { present: 0, total: 0 }
    current.total++
    if (r.status === 'present') current.present++
    dayOfWeekMap[day] = current
  }

  const dayOfWeekRates: Record<string, number> = {}
  for (const [day, { present, total }] of Object.entries(dayOfWeekMap)) {
    dayOfWeekRates[day] = total > 0 ? present / total : 0
  }

  const overallRate = records.length > 0
    ? records.filter((r) => r.status === 'present').length / records.length
    : 0.9

  // Identify chronic absentees
  const studentAttendance = new Map<string, { name: string; present: number; total: number }>()
  for (const r of records) {
    const current = studentAttendance.get(r.student_id) ?? { name: '', present: 0, total: 0 }
    current.total++
    if (r.status === 'present') current.present++
    studentAttendance.set(r.student_id, current)
  }

  const chronicAbsentees = Array.from(studentAttendance.entries())
    .filter(([, v]) => v.total > 5 && v.present / v.total < 0.85)
    .map(([id, v]) => ({
      studentId: id,
      name: v.name || 'Unknown',
      rate: v.present / v.total,
      intervention: '',
    }))

  const prompt = `Predict attendance patterns for the next ${request.daysToPredict} days:

School: ${request.schoolName}
Overall Attendance Rate: ${(overallRate * 100).toFixed(1)}%

Day-of-Week Patterns:
${Object.entries(dayOfWeekRates).map(([day, rate]) => `- ${day}: ${(rate * 100).toFixed(1)}%`).join('\n')}

Chronic Absentees: ${chronicAbsentees.length} students with <85% attendance

Provide:
1. Daily predictions for next ${request.daysToPredict} school days
2. Day-of-week pattern analysis
3. Monthly pattern analysis
4. Specific interventions for chronic absentees
5. School-wide attendance improvement recommendations

Respond as JSON matching the AttendancePredictionResponse structure.`

  const response = await executeStructuredAI<AttendancePredictionResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Attendance'),
      userId,
      schoolId,
      metadata: { type: 'attendance_prediction', schoolId: request.schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        overallRate: data.overallRate ?? overallRate,
        predictions: data.predictions ?? [],
        patterns: data.patterns ?? { dayOfWeek: dayOfWeekRates, monthly: {} },
        chronicAbsentees: data.chronicAbsentees ?? chronicAbsentees,
        recommendations: data.recommendations ?? [],
      }
    }
  )

  return response.parsed
}
