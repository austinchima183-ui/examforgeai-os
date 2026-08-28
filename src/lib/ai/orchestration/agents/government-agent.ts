// ============================================================================
// ExamForge AI Orchestration — Government Agent
// ============================================================================
// Autonomous government/regulatory agent for: district-wide analytics,
// school comparison, compliance monitoring, national reporting,
// underperforming school identification, and equity recommendations.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { sendMessage, broadcastMessage } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface DistrictPerformanceResult {
  districtId: string
  overallScore: number // 0-100
  schoolCount: number
  avgPerformance: number
  avgAttendance: number
  topSchools: string[]
  bottomSchools: string[]
  trends: string[]
  recommendations: string[]
}

export interface SchoolComparisonResult {
  comparisons: Array<{
    schoolId: string
    schoolName: string
    academicScore: number
    attendanceRate: number
    studentCount: number
    teacherRatio: number
    ranking: number
  }>
  metrics: string[]
  insights: string[]
}

export interface ComplianceResult {
  compliant: boolean
  score: number // 0-100
  violations: Array<{ area: string; severity: 'low' | 'medium' | 'high'; description: string; remediation: string }>
  lastAuditDate: string
  nextAuditDate: string
}

export interface NationalReportResult {
  executiveSummary: string
  keyFindings: string[]
  regionalBreakdown: Record<string, { schoolCount: number; avgPerformance: number }>
  trends: string[]
  policyRecommendations: string[]
}

export interface UnderperformingResult {
  schools: Array<{ schoolId: string; schoolName: string; performanceScore: number; primaryIssues: string[]; urgencyLevel: 'medium' | 'high' | 'critical' }>
  totalAtRisk: number
  recommendedInterventions: string[]
}

export interface EquityResult {
  distribution: Array<{ region: string; currentFunding: number; recommendedFunding: number; studentCount: number; performanceIndex: number }>
  inequities: string[]
  recommendations: string[]
  totalBudgetReallocation: number
}

// ──────────────────────────────────────────────────────────────
// GovernmentAgent Class
// ──────────────────────────────────────────────────────────────

export class GovernmentAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── analyzeDistrictPerformance — District-wide analytics ──

  async analyzeDistrictPerformance(districtId: string): Promise<DistrictPerformanceResult> {
    const supabase = await createClient()

    const { data: schools } = await supabase
      .from('schools')
      .select('id, name')
      .eq('district_id', districtId)

    const schoolCount = schools?.length ?? 0

    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('percentage, school_id')
      .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())

    const schoolScores = new Map<string, number[]>()
    for (const session of sessions ?? []) {
      const scores = schoolScores.get(session.school_id) ?? []
      scores.push(session.percentage ?? 0)
      schoolScores.set(session.school_id, scores)
    }

    const schoolAvgs = Array.from(schoolScores.entries()).map(([id, scores]) => ({
      id,
      avg: scores.reduce((s, v) => s + v, 0) / scores.length,
    })).sort((a, b) => b.avg - a.avg)

    const avgPerformance = schoolAvgs.length > 0 ? schoolAvgs.reduce((s, v) => s + v.avg, 0) / schoolAvgs.length : 0

    const prompt = `Analyze district performance:

District ID: ${districtId}
Total Schools: ${schoolCount}
Average Performance: ${avgPerformance.toFixed(1)}%
Top Schools: ${schoolAvgs.slice(0, 3).map(s => s.id).join(', ')}
Bottom Schools: ${schoolAvgs.slice(-3).map(s => s.id).join(', ')}

Provide: overallScore (0-100), avgPerformance, avgAttendance, topSchools, bottomSchools, trends, recommendations.
Respond as JSON.`

    const response = await executeStructuredAI<DistrictPerformanceResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'District Analytics'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          districtId,
          overallScore: Math.min(Math.max(d.overallScore ?? 50, 0), 100),
          schoolCount,
          avgPerformance: d.avgPerformance ?? avgPerformance,
          avgAttendance: d.avgAttendance ?? 0.85,
          topSchools: d.topSchools ?? schoolAvgs.slice(0, 3).map(s => s.id),
          bottomSchools: d.bottomSchools ?? schoolAvgs.slice(-3).map(s => s.id),
          trends: d.trends ?? [],
          recommendations: d.recommendations ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `District analysis: ${districtId} score=${response.parsed.overallScore}`, 0.7, this.context)

    return response.parsed
  }

  // ── compareSchools — School comparison ──

  async compareSchools(schoolIds: string[]): Promise<SchoolComparisonResult> {
    const supabase = await createClient()

    const { data: schools } = await supabase
      .from('schools')
      .select('id, name')
      .in('id', schoolIds)

    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('percentage, school_id')
      .in('school_id', schoolIds)

    const schoolData = (schools ?? []).map(school => {
      const schoolSessions = (sessions ?? []).filter(s => s.school_id === school.id)
      const avgScore = schoolSessions.length > 0 ? schoolSessions.reduce((s, r) => s + (r.percentage ?? 0), 0) / schoolSessions.length : 0
      return { schoolId: school.id, schoolName: school.name ?? '', academicScore: avgScore }
    })

    const prompt = `Compare these schools:

${schoolData.map(s => `${s.schoolName}: Avg Score ${s.academicScore.toFixed(1)}%`).join('\n')}

Provide: comparisons (with academicScore, attendanceRate, studentCount, teacherRatio, ranking), metrics used, insights.
Respond as JSON.`

    const response = await executeStructuredAI<SchoolComparisonResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'School Comparison'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          comparisons: d.comparisons ?? [],
          metrics: d.metrics ?? ['academic_score', 'attendance_rate'],
          insights: d.insights ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── monitorCompliance — Curriculum/policy compliance ──

  async monitorCompliance(regionId: string): Promise<ComplianceResult> {
    const prompt = `Assess compliance for region ${regionId}.

Check: curriculum alignment, teacher certification, student-teacher ratios, safety standards, reporting requirements, data privacy.

Provide: compliant (boolean), score (0-100), violations (area, severity, description, remediation), lastAuditDate, nextAuditDate.
Respond as JSON.`

    const response = await executeStructuredAI<ComplianceResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'Compliance Monitoring'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          compliant: d.compliant ?? true,
          score: Math.min(Math.max(d.score ?? 80, 0), 100),
          violations: d.violations ?? [],
          lastAuditDate: d.lastAuditDate ?? new Date().toISOString().split('T')[0],
          nextAuditDate: d.nextAuditDate ?? new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        }
      }
    )

    if (!response.parsed.compliant) {
      await storeMemory(this.agentId, 'episodic', `Compliance issues in ${regionId}: ${response.parsed.violations.length} violations`, 0.9, this.context)
    }

    return response.parsed
  }

  // ── generateNationalReport — National trend analysis ──

  async generateNationalReport(period: string): Promise<NationalReportResult> {
    const prompt = `Generate a national education trend report for period: ${period}.

Analyze: enrollment trends, performance trends, equity indicators, teacher supply/demand, policy impacts, technology adoption.

Provide: executiveSummary, keyFindings, regionalBreakdown, trends, policyRecommendations.
Respond as JSON.`

    const response = await executeStructuredAI<NationalReportResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'National Report'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          executiveSummary: d.executiveSummary ?? '',
          keyFindings: d.keyFindings ?? [],
          regionalBreakdown: d.regionalBreakdown ?? {},
          trends: d.trends ?? [],
          policyRecommendations: d.policyRecommendations ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated national report for ${period}`, 0.8, this.context)

    return response.parsed
  }

  // ── identifyUnderperforming — At-risk schools ──

  async identifyUnderperforming(districtId: string): Promise<UnderperformingResult> {
    const supabase = await createClient()

    const { data: schools } = await supabase
      .from('schools')
      .select('id, name')
      .eq('district_id', districtId)

    const prompt = `Identify underperforming schools in district ${districtId}:

Schools: ${schools?.map(s => s.name ?? s.id).join(', ') ?? 'None found'}

Criteria: performance score below 40%, declining trends, low attendance, high dropout rates.

Provide: schools (with performanceScore, primaryIssues, urgencyLevel), totalAtRisk, recommendedInterventions.
Respond as JSON.`

    const response = await executeStructuredAI<UnderperformingResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'Underperforming Schools'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          schools: d.schools ?? [],
          totalAtRisk: d.totalAtRisk ?? 0,
          recommendedInterventions: d.recommendedInterventions ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── recommendResourceDistribution — Equity recommendations ──

  async recommendResourceDistribution(district: { id: string; regions: Array<{ name: string; currentFunding: number; studentCount: number; performanceIndex: number }> }): Promise<EquityResult> {
    const prompt = `Recommend equitable resource distribution for district ${district.id}:

${district.regions.map(r => `- ${r.name}: Funding ${r.currentFunding.toLocaleString()}, Students: ${r.studentCount}, Performance: ${r.performanceIndex}`).join('\n')}

Optimize for: performance equity, per-student fairness, need-based allocation.
Provide: distribution (region, currentFunding, recommendedFunding, studentCount, performanceIndex), inequities, recommendations, totalBudgetReallocation.
Respond as JSON.`

    const response = await executeStructuredAI<EquityResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('super_admin', 'Resource Equity'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          distribution: d.distribution ?? [],
          inequities: d.inequities ?? [],
          recommendations: d.recommendations ?? [],
          totalBudgetReallocation: d.totalBudgetReallocation ?? 0,
        }
      }
    )

    return response.parsed
  }
}
