// ============================================================================
// ExamForge AI — Risk Analytics Service
// ============================================================================
// Provides risk analytics for executive dashboards, including at-risk student
// detection, dropout predictions, financial/compliance/operational risk
// indicators, and risk trend tracking.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import {
  type RiskAnalytics,
  type AtRiskStudent,
  type DropoutPrediction,
  type FinancialRisk,
  type ComplianceRisk,
  type OperationalRisk,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main Risk Analytics
// ──────────────────────────────────────────────────────────────

export async function getRiskAnalytics(
  orgId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<RiskAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // At-risk students
  const atRiskStudents = await getAtRiskStudents(orgId, 60)

  // Dropout predictions
  const dropoutPredictions = await getDropoutPredictions(orgId)

  // Financial risks
  const financialRisks = await getFinancialRisks(orgId)

  // Compliance risks
  const complianceRisks = await getComplianceRisks(orgId)

  // Operational risks
  const operationalRisks = await getOperationalRisks(orgId)

  // Risk trends
  const riskTrends = await getRiskTrends(orgId, 12)

  // Calculate overall risk score (0-100)
  const studentRiskFactor = Math.min(atRiskStudents.length * 2, 30)
  const financialRiskFactor = financialRisks.length > 0
    ? Math.min(financialRisks.reduce((sum, r) => sum + riskSeverityWeight(r.severity), 0), 25)
    : 0
  const complianceRiskFactor = complianceRisks.length > 0
    ? Math.min(complianceRisks.reduce((sum, r) => sum + riskSeverityWeight(r.severity), 0), 25)
    : 0
  const operationalRiskFactor = operationalRisks.length > 0
    ? Math.min(operationalRisks.reduce((sum, r) => sum + riskSeverityWeight(r.severity), 0), 20)
    : 0

  const overallRiskScore = Math.min(
    studentRiskFactor + financialRiskFactor + complianceRiskFactor + operationalRiskFactor,
    100
  )

  return {
    atRiskStudents,
    dropoutPredictions: dropoutPredictions,
    financialRisks,
    complianceRisks,
    operationalRisks,
    riskTrends,
    overallRiskScore,
  }
}

// ──────────────────────────────────────────────────────────────
// At-Risk Students
// ──────────────────────────────────────────────────────────────

export async function getAtRiskStudents(
  orgId: string,
  threshold: number = 60
): Promise<AtRiskStudent[]> {
  const supabase = await createClient()

  // Fetch students with their recent results
  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, student_id, created_at, profiles(id, full_name)')

  const resultRows = results ?? []

  // Group results by student
  const studentMap: Record<string, {
    name: string
    scores: number[]
    className: string
  }> = {}

  for (const r of resultRows) {
    if (!r.student_id) continue
    const profile = r.profiles as unknown as { id: string; full_name: string | null } | null
    const name = profile?.full_name ?? 'Unknown Student'

    if (!studentMap[r.student_id]) {
      studentMap[r.student_id] = { name, scores: [], className: '' }
    }

    const total = r.total_marks ?? 100
    const pct = total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
    studentMap[r.student_id].scores.push(pct)
  }

  // Get class info for students
  const { data: enrollments } = await supabase
    .from('class_students')
    .select('student_id, classes(name)')

  const enrollmentRows = enrollments ?? []
  for (const e of enrollmentRows) {
    const cls = e.classes as unknown as { name: string } | null
    if (studentMap[e.student_id]) {
      studentMap[e.student_id].className = cls?.name ?? ''
    }
  }

  // Calculate risk scores
  const atRiskStudents: AtRiskStudent[] = []

  for (const [studentId, data] of Object.entries(studentMap)) {
    if (data.scores.length === 0) continue

    const avgScore = data.scores.reduce((s, v) => s + v, 0) / data.scores.length
    const failCount = data.scores.filter(s => s < 50).length
    const failRate = failCount / data.scores.length

    // Risk score based on low performance and high fail rate
    const performanceRisk = Math.max(0, (100 - avgScore) / 100) * 50
    const failRisk = failRate * 50
    const riskScore = performanceRisk + failRisk

    if (riskScore >= (100 - threshold)) {
      const riskLevel: AtRiskStudent['riskLevel'] =
        riskScore >= 80 ? 'critical' :
        riskScore >= 60 ? 'high' :
        riskScore >= 40 ? 'medium' : 'low'

      const factors: string[] = []
      if (avgScore < 40) factors.push('Very low average score')
      else if (avgScore < 50) factors.push('Below average score')
      if (failRate > 0.5) factors.push('High fail rate')
      if (data.scores.length < 3) factors.push('Insufficient assessment data')

      atRiskStudents.push({
        studentId,
        studentName: data.name,
        className: data.className,
        riskScore: Math.round(riskScore),
        riskLevel,
        factors,
        predictedOutcome: avgScore < 30 ? 'Likely dropout' : avgScore < 45 ? 'At risk of failing' : 'Needs intervention',
        recommendedInterventions: generateInterventions(riskScore, factors),
      })
    }
  }

  return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore)
}

// ──────────────────────────────────────────────────────────────
// Dropout Predictions (AI-Powered)
// ──────────────────────────────────────────────────────────────

async function getDropoutPredictions(
  orgId: string
): Promise<DropoutPrediction[]> {
  const supabase = await createClient()

  // Get at-risk students for AI prediction
  const atRiskStudents = await getAtRiskStudents(orgId, 70)

  if (atRiskStudents.length === 0) return []

  // Use AI to predict dropout probabilities
  try {
    const predictionInput = atRiskStudents.slice(0, 20).map(s => ({
      name: s.studentName,
      riskScore: s.riskScore,
      factors: s.factors,
    }))

    const response = await executeStructuredAI<DropoutPrediction[]>(
      {
        prompt: `Analyze these at-risk students and predict dropout probabilities. For each student, provide: studentId (use the name as identifier), studentName, dropoutProbability (0-1), confidence (0-1), keyFactors (array of strings), timeHorizon ("30_days" | "60_days" | "90_days" | "6_months").

Students data: ${JSON.stringify(predictionInput)}

Return a JSON array of predictions.`,
        systemPrompt: 'You are an education analytics AI that predicts student dropout risk. Analyze the given risk factors and provide realistic dropout probability predictions. Return valid JSON only.',
        userId: 'system',
        schoolId: orgId,
        temperature: 0.3,
      },
      (raw) => {
        if (Array.isArray(raw)) return raw as DropoutPrediction[]
        if (typeof raw === 'string') {
          try { return JSON.parse(raw) as DropoutPrediction[] } catch { return [] }
        }
        return []
      }
    )

    return response.parsed ?? []
  } catch {
    // Fallback: simple rule-based predictions
    return atRiskStudents.slice(0, 20).map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      dropoutProbability: s.riskScore / 100,
      confidence: 0.6,
      keyFactors: s.factors,
      timeHorizon: s.riskScore > 70 ? '30_days' : s.riskScore > 50 ? '60_days' : '90_days',
    }))
  }
}

// ──────────────────────────────────────────────────────────────
// Financial Risks
// ──────────────────────────────────────────────────────────────

export async function getFinancialRisks(
  orgId: string
): Promise<FinancialRisk[]> {
  const supabase = await createClient()
  const risks: FinancialRisk[] = []

  // Check for overdue invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, amount, due_date, status')
    .eq('status', 'overdue')

  const overdueRows = overdueInvoices ?? []
  const overdueTotal = overdueRows.reduce((sum, inv) => sum + (inv.amount ?? 0), 0)

  if (overdueTotal > 0) {
    risks.push({
      id: crypto.randomUUID(),
      type: 'overdue_revenue',
      description: `${overdueRows.length} overdue invoices totaling ${overdueTotal.toLocaleString()}`,
      severity: overdueTotal > 100000 ? 'critical' : overdueTotal > 10000 ? 'high' : 'medium',
      impact: overdueTotal,
      probability: 1,
      mitigationStrategy: 'Follow up on overdue invoices and implement automated payment reminders',
    })
  }

  // Check subscription health
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, status, price_at_subscription')
    .eq('status', 'cancelled')

  const cancelledSubs = subscriptions ?? []
  if (cancelledSubs.length > 0) {
    const lostMRR = cancelledSubs.reduce((sum, s) => sum + (s.price_at_subscription ?? 0), 0)
    risks.push({
      id: crypto.randomUUID(),
      type: 'subscription_churn',
      description: `${cancelledSubs.length} cancelled subscriptions, lost MRR: ${lostMRR.toLocaleString()}`,
      severity: lostMRR > 50000 ? 'high' : 'medium',
      impact: lostMRR,
      probability: 0.8,
      mitigationStrategy: 'Implement retention campaigns and exit surveys to understand churn reasons',
    })
  }

  // Check cash runway
  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('status', 'completed')

  const paymentRows = payments ?? []
  const avgMonthlyRevenue = paymentRows.length > 0
    ? paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0) / Math.max(1, getMonthSpan(paymentRows))
    : 0

  if (avgMonthlyRevenue < 1000) {
    risks.push({
      id: crypto.randomUUID(),
      type: 'low_revenue',
      description: `Average monthly revenue is critically low: ${avgMonthlyRevenue.toLocaleString()}`,
      severity: 'high',
      impact: avgMonthlyRevenue * 12,
      probability: 0.9,
      mitigationStrategy: 'Focus on sales pipeline and upselling existing customers',
    })
  }

  return risks
}

// ──────────────────────────────────────────────────────────────
// Compliance Risks
// ──────────────────────────────────────────────────────────────

export async function getComplianceRisks(
  orgId: string
): Promise<ComplianceRisk[]> {
  const supabase = await createClient()
  const risks: ComplianceRisk[] = []

  // Check data retention compliance
  const { data: settings } = await supabase
    .from('school_settings')
    .select('id, is_compliant, compliance_details')
    .eq('school_id', orgId)
    .limit(1)

  const settingsRow = settings?.[0]

  if (settingsRow && !settingsRow.is_compliant) {
    const details = settingsRow.compliance_details as Record<string, boolean> | null
    const violations = details
      ? Object.entries(details).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' '))
      : ['General non-compliance']

    risks.push({
      id: crypto.randomUUID(),
      regulation: 'Institutional Compliance',
      description: `Non-compliant in: ${violations.join(', ')}`,
      severity: 'high',
      currentStatus: 'non_compliant',
      deadline: null,
      affectedEntities: [orgId],
    })
  }

  // Check for data privacy compliance
  const { count: studentDataCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)

  if ((studentDataCount ?? 0) > 0) {
    risks.push({
      id: crypto.randomUUID(),
      regulation: 'Data Privacy (NDPR/GDPR)',
      description: `${studentDataCount} student records require data privacy compliance`,
      severity: 'medium',
      currentStatus: 'requires_review',
      deadline: null,
      affectedEntities: [orgId],
    })
  }

  return risks
}

// ──────────────────────────────────────────────────────────────
// Operational Risks
// ──────────────────────────────────────────────────────────────

export async function getOperationalRisks(
  orgId: string
): Promise<OperationalRisk[]> {
  const supabase = await createClient()
  const risks: OperationalRisk[] = []

  // Check teacher workload
  const { data: teachers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('school_id', orgId)
    .eq('role', 'teacher')

  const teacherRows = teachers ?? []

  if (teacherRows.length === 0) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'staffing',
      description: 'No teachers assigned to this organization',
      severity: 'critical',
      impact: 90,
      likelihood: 1,
      mitigationPlan: 'Recruit and assign teachers immediately',
    })
  }

  // Check student-teacher ratio
  const { count: studentCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('role', 'student')

  const ratio = teacherRows.length > 0 ? (studentCount ?? 0) / teacherRows.length : 0

  if (ratio > 40) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'class_size',
      description: `High student-teacher ratio: ${ratio.toFixed(1)}:1`,
      severity: ratio > 60 ? 'critical' : 'high',
      impact: 70,
      likelihood: 0.9,
      mitigationPlan: 'Hire additional teachers or redistribute class assignments',
    })
  }

  // Check for AI service errors
  const { data: aiErrors } = await supabase
    .from('ai_generation_requests')
    .select('id')
    .eq('school_id', orgId)
    .eq('status', 'failed')

  const errorCount = (aiErrors ?? []).length
  if (errorCount > 10) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'ai_service',
      description: `High AI generation failure rate: ${errorCount} failures`,
      severity: errorCount > 50 ? 'high' : 'medium',
      impact: 50,
      likelihood: 0.7,
      mitigationPlan: 'Investigate AI service errors and implement retry logic',
    })
  }

  return risks
}

// ──────────────────────────────────────────────────────────────
// Risk Trends
// ──────────────────────────────────────────────────────────────

export async function getRiskTrends(
  orgId: string,
  months: number = 12
): Promise<TimeSeriesPoint[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Track monthly risk scores based on exam failures
  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, created_at')
    .eq('school_id', orgId)
    .gte('created_at', startDate.toISOString())

  const resultRows = results ?? []

  // Group by month and calculate fail rate as risk proxy
  const monthly: Record<string, { fail: number; total: number }> = {}
  for (const r of resultRows) {
    if (!r.created_at) continue
    const monthKey = r.created_at.slice(0, 7)
    if (!monthly[monthKey]) monthly[monthKey] = { fail: 0, total: 0 }

    const max = r.total_marks ?? 100
    const pct = max > 0 ? ((r.score_percentage ?? 0) / max) * 100 : 0
    monthly[monthKey].total++
    if (pct < 50) monthly[monthKey].fail++
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: data.total > 0 ? (data.fail / data.total) * 100 : 0,
    }))
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function riskSeverityWeight(severity: 'low' | 'medium' | 'high' | 'critical'): number {
  switch (severity) {
    case 'critical': return 20
    case 'high': return 15
    case 'medium': return 8
    case 'low': return 3
  }
}

function generateInterventions(riskScore: number, factors: string[]): string[] {
  const interventions: string[] = []

  if (riskScore > 70) {
    interventions.push('Schedule immediate counseling session')
    interventions.push('Notify parents/guardians')
  }

  if (factors.includes('High fail rate')) {
    interventions.push('Assign remedial classes')
    interventions.push('Reduce assessment difficulty temporarily')
  }

  if (factors.includes('Below average score') || factors.includes('Very low average score')) {
    interventions.push('Create personalized study plan')
    interventions.push('Pair with high-performing peer mentor')
  }

  if (factors.includes('Insufficient assessment data')) {
    interventions.push('Schedule diagnostic assessment')
  }

  interventions.push('Monitor weekly progress')

  return interventions
}

function getMonthSpan(payments: Array<{ created_at: string | null }>): number {
  if (payments.length === 0) return 1
  const dates = payments
    .filter(p => p.created_at)
    .map(p => new Date(p.created_at!).getTime())
  if (dates.length === 0) return 1
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const months = (max - min) / (30 * 86400000)
  return Math.max(1, Math.round(months))
}
