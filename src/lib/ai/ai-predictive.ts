// ============================================================================
// ExamForge Predictive Analytics — ML-Powered Predictions
// ============================================================================
// Production-ready predictive analytics using AI + statistical methods:
// - Dropout prediction
// - Failure prediction
// - Attendance prediction
// - Revenue prediction
// All models use real data from Supabase and are ready for
// upgrading to proper ML models (TensorFlow.js, Python microservice).
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI, getSystemPrompt } from './ai-engine'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface DropoutPrediction {
  studentId: string
  studentName: string
  dropoutProbability: number // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  primaryFactors: Array<{
    factor: string
    weight: number // 0-1, how much this factor contributes
    currentValue: string
    threshold: string
  }>
  predictedDropoutDate: string | null
  interventionUrgency: 'low' | 'medium' | 'high' | 'critical'
  recommendedActions: string[]
}

export interface FailurePrediction {
  studentId: string
  studentName: string
  examId: string
  examTitle: string
  failureProbability: number // 0-1
  predictedScore: number // 0-100
  confidence: number // 0-1
  weakAreas: string[]
  studyRecommendations: string[]
}

export interface AttendancePrediction {
  studentId: string
  studentName: string
  futurePredictions: Array<{
    date: string
    presentProbability: number
    confidence: number
  }>
  chronicAbsenceRisk: number // 0-1
  patternType: 'consistent' | 'sporadic' | 'declining' | 'improving'
  interventions: string[]
}

export interface RevenuePrediction {
  month: string
  projectedRevenue: number
  lowerBound: number
  upperBound: number
  confidence: number
  collectionRate: number
  riskFactors: string[]
}

// ──────────────────────────────────────────────────────────────
// Dropout Prediction
// ──────────────────────────────────────────────────────────────

export async function predictDropout(
  schoolId: string,
  userId: string
): Promise<DropoutPrediction[]> {
  const supabase = await createClient()

  // Fetch comprehensive student data
  const { data: students } = await supabase
    .from('users')
    .select('id, full_name, created_at')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .eq('is_active', true)

  if (!students?.length) return []

  // Fetch all relevant data in parallel
  const studentIds = students.map((s) => s.id)
  const [sessionsResult, attendanceResult, feeResult] = await Promise.all([
    supabase
      .from('exam_sessions')
      .select('student_id, percentage, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('student_id, status, date')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .limit(5000),
    supabase
      .from('fee_assignments')
      .select('student_id, status, amount_due, amount_paid')
      .in('student_id', studentIds),
  ])

  const sessions = sessionsResult.data ?? []
  const attendance = attendanceResult.data ?? []
  const fees = feeResult.data ?? []

  // Build per-student profiles
  const studentProfiles = students.map((student) => {
    const studentSessions = sessions.filter((s) => s.student_id === student.id)
    const studentAttendance = attendance.filter((a) => a.student_id === student.id)
    const studentFees = fees.filter((f) => f.student_id === student.id)

    const avgScore = studentSessions.length > 0
      ? studentSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / studentSessions.length
      : null
    const recentScores = studentSessions.slice(0, 5).map((s) => s.percentage ?? 0)
    const scoreTrend = recentScores.length >= 2
      ? (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length
      : 0

    const attendanceRate = studentAttendance.length > 0
      ? studentAttendance.filter((a) => a.status === 'present').length / studentAttendance.length
      : null
    const absencesLast30 = studentAttendance.filter((a) => {
      const d = new Date(a.date)
      return a.status === 'absent' && d > new Date(Date.now() - 30 * 86400000)
    }).length

    const overdueFees = studentFees.filter((f) => f.status === 'overdue').length
    const feeBalance = studentFees.reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0)

    const daysEnrolled = Math.max(1, (Date.now() - new Date(student.created_at).getTime()) / 86400000)
    const examParticipationRate = studentSessions.length / Math.max(1, daysEnrolled / 30) // exams per month

    return {
      studentId: student.id,
      studentName: student.full_name ?? 'Unknown',
      avgScore,
      scoreTrend,
      attendanceRate,
      absencesLast30,
      overdueFees,
      feeBalance,
      examCount: studentSessions.length,
      examParticipationRate,
      daysEnrolled,
    }
  })

  const prompt = `Predict dropout risk for each student using multiple risk factors:

${studentProfiles.map((s, i) => `
Student ${i + 1}: ${s.studentName}
- Average Score: ${s.avgScore?.toFixed(1) ?? 'No data'}%
- Score Trend: ${s.scoreTrend > 0 ? 'Improving' : s.scoreTrend < -5 ? 'Declining' : 'Stable'} (${s.scoreTrend.toFixed(1)})
- Attendance Rate: ${s.attendanceRate !== null ? `${(s.attendanceRate * 100).toFixed(1)}%` : 'No data'}
- Absences (Last 30 days): ${s.absencesLast30}
- Overdue Fees: ${s.overdueFees} (Balance: ${s.feeBalance.toLocaleString()})
- Exam Count: ${s.examCount}
- Days Enrolled: ${Math.round(s.daysEnrolled)}
`).join('')}

For each student, predict dropout probability using these known risk factors:
1. Low attendance (<80% is concerning, <70% is critical)
2. Declining or very low scores (<40% average)
3. Multiple overdue fees (financial stress indicator)
4. Low exam participation (disengagement indicator)
5. Recent spike in absences

Provide:
1. dropoutProbability (0-1)
2. riskLevel (low/medium/high/critical)
3. Primary factors with weights (what's driving the risk)
4. Predicted dropout date if probability > 0.5
5. Intervention urgency
6. Specific recommended actions

Respond as a JSON array of DropoutPrediction objects.`

  const response = await executeStructuredAI<DropoutPrediction[]>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Dropout Prediction'),
      userId,
      schoolId,
      metadata: { type: 'dropout_prediction', schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const predictions = Array.isArray(data) ? data : data.predictions ?? []
      return predictions.map((p: Record<string, unknown>, i: number) => ({
        studentId: studentProfiles[i]?.studentId ?? (p.studentId as string),
        studentName: studentProfiles[i]?.studentName ?? (p.studentName as string),
        dropoutProbability: Math.min(Math.max(p.dropoutProbability as number ?? 0, 0), 1),
        riskLevel: p.riskLevel as DropoutPrediction['riskLevel'] ?? 'low',
        primaryFactors: (p.primaryFactors as DropoutPrediction['primaryFactors']) ?? [],
        predictedDropoutDate: (p.predictedDropoutDate as string) ?? null,
        interventionUrgency: p.interventionUrgency as DropoutPrediction['interventionUrgency'] ?? 'low',
        recommendedActions: (p.recommendedActions as string[]) ?? [],
      }))
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Failure Prediction (per exam)
// ──────────────────────────────────────────────────────────────

export async function predictFailure(
  schoolId: string,
  examId: string,
  userId: string
): Promise<FailurePrediction[]> {
  const supabase = await createClient()

  // Fetch exam and student data
  const { data: exam } = await supabase
    .from('exams')
    .select('id, title, pass_mark, total_marks, subject_id, subjects(name)')
    .eq('id', examId)
    .single()

  if (!exam) return []

  const { data: students } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .eq('is_active', true)

  if (!students?.length) return []

  // Fetch historical performance for each student in this subject
  const { data: historicalSessions } = await supabase
    .from('exam_sessions')
    .select('student_id, percentage, total_score, max_score, exam_id, exams(subject_id)')
    .in('student_id', students.map((s) => s.id))
    .order('created_at', { ascending: false })

  const passPercent = exam.pass_mark / exam.total_marks * 100

  const prompt = `Predict exam failure for each student:

Exam: ${exam.title}
Subject: ${(exam.subjects as unknown as Record<string, unknown>)?.name ?? 'Unknown'}
Pass Mark: ${exam.pass_mark}/${exam.total_marks} (${passPercent.toFixed(0)}%)

Students and their historical performance:
${students.map((student) => {
    const studentSessions = (historicalSessions ?? [])
      .filter((s) => s.student_id === student.id)
      .slice(0, 10)
    const avg = studentSessions.length > 0
      ? studentSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / studentSessions.length
      : null
    const trend = studentSessions.length >= 2
      ? (studentSessions[0].percentage ?? 0) - (studentSessions[studentSessions.length - 1].percentage ?? 0)
      : 0
    return `- ${student.full_name}: Avg ${avg?.toFixed(1) ?? 'N/A'}%, Trend ${trend > 0 ? '+' : ''}${trend.toFixed(1)}, ${studentSessions.length} past exams`
  }).join('\n')}

For each student, predict:
1. failureProbability (0-1) — likelihood of scoring below ${passPercent.toFixed(0)}%
2. predictedScore (0-100)
3. confidence in the prediction (0-1)
4. weakAreas that need improvement
5. studyRecommendations specific to this exam

Respond as a JSON array of FailurePrediction objects.`

  const response = await executeStructuredAI<FailurePrediction[]>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Failure Prediction'),
      userId,
      schoolId,
      metadata: { type: 'failure_prediction', examId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const predictions = Array.isArray(data) ? data : data.predictions ?? []
      return predictions.map((p: Record<string, unknown>, i: number) => ({
        studentId: students[i]?.id ?? (p.studentId as string),
        studentName: students[i]?.full_name ?? (p.studentName as string),
        examId,
        examTitle: exam.title,
        failureProbability: Math.min(Math.max(p.failureProbability as number ?? 0, 0), 1),
        predictedScore: Math.min(Math.max(p.predictedScore as number ?? 50, 0), 100),
        confidence: Math.min(Math.max(p.confidence as number ?? 0.5, 0), 1),
        weakAreas: (p.weakAreas as string[]) ?? [],
        studyRecommendations: (p.studyRecommendations as string[]) ?? [],
      }))
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Attendance Prediction
// ──────────────────────────────────────────────────────────────

export async function predictAttendance(
  schoolId: string,
  studentId: string,
  userId: string,
  daysToPredict: number = 14
): Promise<AttendancePrediction> {
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', studentId)
    .single()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('status, date')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(90) // Last 3 months

  const records = attendance ?? []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Calculate day-of-week patterns
  const dayPatterns: Record<string, { present: number; total: number }> = {}
  for (const r of records) {
    const day = dayNames[new Date(r.date).getDay()]
    const current = dayPatterns[day] ?? { present: 0, total: 0 }
    current.total++
    if (r.status === 'present') current.present++
    dayPatterns[day] = current
  }

  const overallRate = records.length > 0
    ? records.filter((r) => r.status === 'present').length / records.length
    : 0.9

  // Detect pattern type
  const recentRate = records.slice(0, 14).length > 0
    ? records.slice(0, 14).filter((r) => r.status === 'present').length / records.slice(0, 14).length
    : overallRate
  const olderRate = records.slice(14, 42).length > 0
    ? records.slice(14, 42).filter((r) => r.status === 'present').length / records.slice(14, 42).length
    : overallRate

  let patternType: AttendancePrediction['patternType'] = 'consistent'
  if (recentRate < olderRate - 0.1) patternType = 'declining'
  else if (recentRate > olderRate + 0.1) patternType = 'improving'
  else if (records.filter((r) => r.status === 'absent').length > records.length * 0.2) patternType = 'sporadic'

  const prompt = `Predict attendance for the next ${daysToPredict} school days:

Student: ${student?.full_name ?? 'Unknown'}
Overall Attendance Rate: ${(overallRate * 100).toFixed(1)}%
Recent (2 weeks) Rate: ${(recentRate * 100).toFixed(1)}%
Pattern: ${patternType}

Day-of-Week Patterns:
${Object.entries(dayPatterns).map(([day, { present, total }]) => `- ${day}: ${total > 0 ? ((present / total) * 100).toFixed(1) : 0}% (${present}/${total})`).join('\n')}

Recent Attendance (last 14 days):
${records.slice(0, 14).map((r) => `- ${r.date}: ${r.status}`).join('\n') ?? 'No recent data'}

Provide:
1. Day-by-day predictions for next ${daysToPredict} school days
2. Chronic absence risk score (0-1)
3. Pattern type classification
4. Specific interventions if at risk

Respond as JSON matching the AttendancePrediction structure.`

  const response = await executeStructuredAI<AttendancePrediction>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Attendance Prediction'),
      userId,
      schoolId,
      metadata: { type: 'attendance_prediction', studentId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        studentId,
        studentName: student?.full_name ?? 'Unknown',
        futurePredictions: data.futurePredictions ?? [],
        chronicAbsenceRisk: Math.min(Math.max(data.chronicAbsenceRisk ?? (1 - overallRate), 0), 1),
        patternType: data.patternType ?? patternType,
        interventions: data.interventions ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Revenue Prediction
// ──────────────────────────────────────────────────────────────

export async function predictRevenue(
  schoolId: string,
  userId: string,
  monthsToPredict: number = 6
): Promise<RevenuePrediction[]> {
  const supabase = await createClient()

  // Fetch historical payment data
  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: feeAssignments } = await supabase
    .from('fee_assignments')
    .select('amount_due, amount_paid, status, due_date')
    .limit(500)

  // Build monthly revenue data
  const monthlyRevenue: Record<string, number> = {}
  for (const payment of payments ?? []) {
    if (payment.status === 'successful') {
      const month = payment.created_at.substring(0, 7)
      monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + payment.amount
    }
  }

  const totalFeesDue = feeAssignments?.reduce((sum, f) => sum + f.amount_due, 0) ?? 0
  const totalFeesPaid = feeAssignments?.reduce((sum, f) => sum + f.amount_paid, 0) ?? 0
  const collectionRate = totalFeesDue > 0 ? totalFeesPaid / totalFeesDue : 1

  const prompt = `Predict school revenue for the next ${monthsToPredict} months:

Historical Monthly Revenue:
${Object.entries(monthlyRevenue).sort().map(([month, amount]) => `- ${month}: ${amount.toLocaleString()}`).join('\n') || 'Limited historical data'}

Current Fee Status:
- Total Fees Due: ${totalFeesDue.toLocaleString()}
- Total Fees Collected: ${totalFeesPaid.toLocaleString()}
- Collection Rate: ${(collectionRate * 100).toFixed(1)}%
- Overdue: ${feeAssignments?.filter(f => f.status === 'overdue').length ?? 0} assignments

Provide monthly revenue predictions with:
1. Projected revenue
2. Lower and upper bounds (confidence interval)
3. Confidence level (0-1)
4. Expected collection rate
5. Risk factors that could affect revenue

Respond as a JSON array of RevenuePrediction objects for the next ${monthsToPredict} months.`

  const response = await executeStructuredAI<RevenuePrediction[]>(
    {
      prompt,
      systemPrompt: getSystemPrompt('school_admin', 'Revenue Prediction'),
      userId,
      schoolId,
      metadata: { type: 'revenue_prediction', schoolId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(data) ? data : data.predictions ?? []
    }
  )

  return response.parsed
}
