// ============================================================================
// ExamForge AI Orchestration — Principal Agent
// ============================================================================
// Autonomous principal/school-admin agent that can: monitor school health,
// allocate resources, manage staffing, coordinate interventions, approve actions,
// and communicate with teachers and parents.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { sendMessage, broadcastMessage, requestDelegation, escalateToHuman } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Input/Output Types
// ──────────────────────────────────────────────────────────────

export interface SchoolPerformanceResult {
  healthScore: number // 0-100
  academicPerformance: { avgScore: number; passRate: number; trend: 'improving' | 'stable' | 'declining' }
  attendanceRate: number
  enrollmentTrend: 'growing' | 'stable' | 'shrinking'
  teacherUtilization: number // 0-1
  riskAreas: string[]
  recommendations: string[]
}

export interface ResourceAllocationResult {
  allocations: Array<{ area: string; currentAllocation: number; recommendedAllocation: number; justification: string }>
  totalBudget: number
  savingsPotential: number
  priorityActions: string[]
}

export interface StaffingResult {
  recommendations: Array<{ type: 'hire' | 'transfer' | 'retrain'; role: string; justification: string; priority: 'low' | 'medium' | 'high' }>
  currentStaffing: { teachers: number; admin: number; ratio: number }
  idealRatios: { studentTeacherRatio: number }
}

export interface ApprovalResult {
  approved: boolean
  conditions: string[]
  riskAssessment: string
  alternativeSuggestions: string[]
}

export interface SchoolReportResult {
  executiveSummary: string
  keyMetrics: Record<string, number>
  highlights: string[]
  concerns: string[]
  actionItems: string[]
}

// ──────────────────────────────────────────────────────────────
// PrincipalAgent Class
// ──────────────────────────────────────────────────────────────

export class PrincipalAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── monitorSchoolPerformance — Overall school health ──

  async monitorSchoolPerformance(schoolId: string): Promise<SchoolPerformanceResult> {
    const supabase = await createClient()

    const [sessionsResult, attendanceResult, enrollmentResult, teacherResult] = await Promise.all([
      supabase.from('exam_sessions').select('percentage, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('created_at', { ascending: false }),
      supabase.from('attendance').select('status, date').eq('school_id', schoolId).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
      supabase.from('users').select('id, created_at').eq('school_id', schoolId).eq('role', 'student').eq('is_active', true),
      supabase.from('users').select('id').eq('school_id', schoolId).eq('role', 'teacher').eq('is_active', true),
    ])

    const sessions = sessionsResult.data ?? []
    const attendance = attendanceResult.data ?? []
    const students = enrollmentResult.data ?? []
    const teachers = teacherResult.data ?? []

    const avgScore = sessions.length > 0 ? sessions.reduce((s, r) => s + (r.percentage ?? 0), 0) / sessions.length : 0
    const passRate = sessions.length > 0 ? sessions.filter(s => (s.percentage ?? 0) >= 40).length / sessions.length : 0
    const attendanceRate = attendance.length > 0 ? attendance.filter(a => a.status === 'present').length / attendance.length : 0

    const memories = await retrieveMemories(this.agentId, 'school performance', 5)
    const memoryContext = memories.length > 0 ? `\n\nHistorical context:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Analyze overall school performance and health:

Average Score: ${avgScore.toFixed(1)}%
Pass Rate: ${(passRate * 100).toFixed(1)}%
Attendance Rate: ${(attendanceRate * 100).toFixed(1)}%
Total Students: ${students.length}
Total Teachers: ${teachers.length}
Student-Teacher Ratio: ${teachers.length > 0 ? (students.length / teachers.length).toFixed(1) : 'N/A'}
${memoryContext}

Provide: healthScore (0-100), academicPerformance, attendanceRate, enrollmentTrend, teacherUtilization, riskAreas, recommendations.
Respond as JSON.`

    const response = await executeStructuredAI<SchoolPerformanceResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'School Performance'),
        userId: this.context.userId,
        schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          healthScore: Math.min(Math.max(d.healthScore ?? 50, 0), 100),
          academicPerformance: d.academicPerformance ?? { avgScore, passRate, trend: 'stable' },
          attendanceRate: d.attendanceRate ?? attendanceRate,
          enrollmentTrend: d.enrollmentTrend ?? 'stable',
          teacherUtilization: d.teacherUtilization ?? 0.8,
          riskAreas: d.riskAreas ?? [],
          recommendations: d.recommendations ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `School health check: score=${response.parsed.healthScore}, risks=${response.parsed.riskAreas.length}`, 0.7, this.context)

    return response.parsed
  }

  // ── allocateResources — Resource allocation recommendations ──

  async allocateResources(needs: Array<{ area: string; currentBudget: number; requestedBudget: number; justification: string }>): Promise<ResourceAllocationResult> {
    const prompt = `Optimize resource allocation based on these needs:

${needs.map(n => `- ${n.area}: Current ${n.currentBudget}, Requested ${n.requestedBudget} (${n.justification})`).join('\n')}

Provide: allocations with currentAllocation, recommendedAllocation, justification; totalBudget, savingsPotential, priorityActions.
Respond as JSON.`

    const response = await executeStructuredAI<ResourceAllocationResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Resource Allocation'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          allocations: d.allocations ?? [],
          totalBudget: d.totalBudget ?? 0,
          savingsPotential: d.savingsPotential ?? 0,
          priorityActions: d.priorityActions ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── manageStaffing — Hiring/firing/transfer recommendations ──

  async manageStaffing(data: { currentTeachers: number; currentAdmin: number; totalStudents: number; openPositions: string[] }): Promise<StaffingResult> {
    const prompt = `Analyze staffing needs:

Current Teachers: ${data.currentTeachers}
Current Admin: ${data.currentAdmin}
Total Students: ${data.totalStudents}
Student-Teacher Ratio: ${data.currentTeachers > 0 ? (data.totalStudents / data.currentTeachers).toFixed(1) : 'N/A'}
Open Positions: ${data.openPositions.join(', ') || 'None'}

Provide recommendations for hiring, transfers, or retraining. Include ideal student-teacher ratio.
Respond as JSON.`

    const response = await executeStructuredAI<StaffingResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Staffing'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          recommendations: d.recommendations ?? [],
          currentStaffing: d.currentStaffing ?? { teachers: data.currentTeachers, admin: data.currentAdmin, ratio: data.totalStudents / Math.max(data.currentTeachers, 1) },
          idealRatios: d.idealRatios ?? { studentTeacherRatio: 25 },
        }
      }
    )

    return response.parsed
  }

  // ── coordinateInterventions — Cross-teacher interventions ──

  async coordinateInterventions(atRiskStudents: Array<{ studentId: string; studentName: string; issues: string[]; currentTeacher: string }>): Promise<Array<{ studentId: string; coordinatedPlan: string; involvedTeachers: string[] }>> {
    const prompt = `Create coordinated intervention plans across teachers for at-risk students:

${atRiskStudents.map(s => `- ${s.studentName} (Teacher: ${s.currentTeacher}): ${s.issues.join(', ')}`).join('\n')}

For each student, provide: studentId, coordinatedPlan, involvedTeachers.
Respond as JSON array.`

    const response = await executeStructuredAI<Array<{ studentId: string; coordinatedPlan: string; involvedTeachers: string[] }>>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Intervention Coordination'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.5,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(d) ? d : d.plans ?? []
      }
    )

    await storeMemory(this.agentId, 'episodic', `Coordinated interventions for ${atRiskStudents.length} at-risk students`, 0.8, this.context)

    return response.parsed
  }

  // ── generateSchoolReport — School-wide report ──

  async generateSchoolReport(period: string): Promise<SchoolReportResult> {
    const supabase = await createClient()
    const schoolId = this.context.schoolId ?? ''

    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('percentage')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const avgScore = (sessions ?? []).length > 0 ? sessions!.reduce((s, r) => s + (r.percentage ?? 0), 0) / sessions!.length : 0

    const prompt = `Generate a school-wide performance report for period: ${period}
Current average score: ${avgScore.toFixed(1)}%

Provide: executiveSummary, keyMetrics, highlights, concerns, actionItems.
Respond as JSON.`

    const response = await executeStructuredAI<SchoolReportResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'School Report'),
        userId: this.context.userId,
        schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          executiveSummary: d.executiveSummary ?? '',
          keyMetrics: d.keyMetrics ?? {},
          highlights: d.highlights ?? [],
          concerns: d.concerns ?? [],
          actionItems: d.actionItems ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── approveAction — Human-in-the-loop approval ──

  async approveAction(action: { type: string; description: string; estimatedCost: number; impactLevel: 'low' | 'medium' | 'high' }): Promise<ApprovalResult> {
    const guardrails = this.config.guardrails

    if (action.estimatedCost > guardrails.requireHumanApprovalAbove) {
      await escalateToHuman(this.agentId, `Action requiring approval: ${action.description} (Cost: $${action.estimatedCost.toFixed(2)}, Impact: ${action.impactLevel})`, action.impactLevel === 'high' ? 'critical' : 'high', this.context)

      return {
        approved: false,
        conditions: ['Requires human approval due to cost threshold'],
        riskAssessment: `Estimated cost $${action.estimatedCost.toFixed(2)} exceeds approval threshold $${guardrails.requireHumanApprovalAbove.toFixed(2)}`,
        alternativeSuggestions: ['Consider breaking this into smaller actions', 'Request budget reallocation'],
      }
    }

    const prompt = `Evaluate this action for approval:

Type: ${action.type}
Description: ${action.description}
Estimated Cost: $${action.estimatedCost.toFixed(2)}
Impact Level: ${action.impactLevel}

Provide: approved (boolean), conditions, riskAssessment, alternativeSuggestions.
Respond as JSON.`

    const response = await executeStructuredAI<ApprovalResult>(
      {
        prompt,
        systemPrompt: 'You are an approval evaluation system. Assess risks and provide conditional approval.',
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          approved: d.approved ?? false,
          conditions: d.conditions ?? [],
          riskAssessment: d.riskAssessment ?? '',
          alternativeSuggestions: d.alternativeSuggestions ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── communicateWithTeachers — Bulk communication ──

  async communicateWithTeachers(message: { subject: string; body: string; priority?: 'low' | 'normal' | 'high' }): Promise<{ sent: number }> {
    const supabase = await createClient()
    const schoolId = this.context.schoolId ?? ''

    const { data: teachers } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .eq('is_active', true)

    const sent = teachers?.length ?? 0

    if (teachers && teachers.length > 0) {
      await broadcastMessage(this.agentId, ['teacher'], `${message.subject}: ${message.body}`, this.context)
    }

    await storeMemory(this.agentId, 'episodic', `Communicated with ${sent} teachers: ${message.subject}`, 0.5, this.context)

    return { sent }
  }

  // ── communicateWithParents — Parent communication ──

  async communicateWithParents(message: { subject: string; body: string; targetStudentIds?: string[] }): Promise<{ sent: number }> {
    const supabase = await createClient()
    const schoolId = this.context.schoolId ?? ''

    if (message.targetStudentIds && message.targetStudentIds.length > 0) {
      // Targeted communication
      const { data: parents } = await supabase
        .from('parent_students')
        .select('parent_id')
        .in('student_id', message.targetStudentIds)

      const sent = parents?.length ?? 0

      for (const parent of parents ?? []) {
        await supabase.from('notifications').insert({
          user_id: parent.parent_id,
          type: 'announcement',
          channel: 'in_app',
          title: message.subject,
          body: message.body.substring(0, 500),
          priority: 'normal',
        })
      }

      await storeMemory(this.agentId, 'episodic', `Communicated with ${sent} parents: ${message.subject}`, 0.5, this.context)
      return { sent }
    }

    // School-wide parent communication
    const { data: allParents } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'parent')
      .eq('is_active', true)

    const sent = allParents?.length ?? 0

    if (allParents && allParents.length > 0) {
      for (const parent of allParents.slice(0, 200)) {
        await supabase.from('notifications').insert({
          user_id: parent.id,
          type: 'announcement',
          channel: 'in_app',
          title: message.subject,
          body: message.body.substring(0, 500),
          priority: 'normal',
        })
      }
    }

    return { sent }
  }
}
