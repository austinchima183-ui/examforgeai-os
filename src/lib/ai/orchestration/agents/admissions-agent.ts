// ============================================================================
// ExamForge AI Orchestration — Admissions Agent
// ============================================================================
// Autonomous admissions agent for: application processing, enrollment forecasting,
// class composition optimization, offer letter generation, orientation scheduling,
// and conversion rate tracking.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { sendMessage } from '../agent-communicator'
import type { AgentContext, AgentConfig } from '../types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ApplicationInput {
  applicantId: string
  applicantName: string
  appliedClass: string
  previousSchool?: string
  previousGrades?: Array<{ subject: string; grade: string }>
  entranceScore?: number
  documentsComplete: boolean
}

export interface ApplicationResult {
  recommendation: 'accept' | 'waitlist' | 'reject' | 'review_required'
  score: number // 0-100
  reasoning: string
  conditions: string[]
  suggestedClass: string
}

export interface EnrollmentForecast {
  predictedEnrollment: number
  confidence: number
  byClass: Record<string, number>
  trend: 'growing' | 'stable' | 'declining'
  seasonalFactors: string[]
}

export interface ClassCompositionResult {
  classes: Array<{ className: string; students: string[]; balanceScore: number }>
  overallBalance: number
  recommendations: string[]
}

export interface ConversionAnalytics {
  totalApplications: number
  accepted: number
  enrolled: number
  conversionRate: number
  bySource: Record<string, { applications: number; enrolled: number; rate: number }>
  dropoffPoints: Array<{ stage: string; dropoffPercent: number }>
}

// ──────────────────────────────────────────────────────────────
// AdmissionsAgent Class
// ──────────────────────────────────────────────────────────────

export class AdmissionsAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── processApplication — AI-assisted application review ──

  async processApplication(application: ApplicationInput): Promise<ApplicationResult> {
    const memories = await retrieveMemories(this.agentId, 'admissions criteria', 5)
    const memoryContext = memories.length > 0 ? `\n\nAdmission criteria context:\n${memories.map(m => m.content).join('\n')}` : ''

    const prompt = `Review this student application:

Applicant: ${application.applicantName}
Applied Class: ${application.appliedClass}
Previous School: ${application.previousSchool ?? 'Not provided'}
Previous Grades: ${application.previousGrades?.map(g => `${g.subject}: ${g.grade}`).join(', ') ?? 'Not provided'}
Entrance Score: ${application.entranceScore?.toString() ?? 'Not taken'}
Documents Complete: ${application.documentsComplete}
${memoryContext}

Provide: recommendation (accept/waitlist/reject/review_required), score (0-100), reasoning, conditions, suggestedClass.
Respond as JSON.`

    const response = await executeStructuredAI<ApplicationResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Admissions'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          recommendation: d.recommendation ?? 'review_required',
          score: Math.min(Math.max(d.score ?? 50, 0), 100),
          reasoning: d.reasoning ?? '',
          conditions: d.conditions ?? [],
          suggestedClass: d.suggestedClass ?? application.appliedClass,
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Processed application for ${application.applicantName}: ${response.parsed.recommendation} (score: ${response.parsed.score})`, 0.6, this.context)

    return response.parsed
  }

  // ── predictEnrollment — Enrollment forecasting ──

  async predictEnrollment(historicalData: Array<{ month: string; applications: number; enrolled: number }>): Promise<EnrollmentForecast> {
    const prompt = `Predict enrollment for the next academic period based on historical data:

${historicalData.map(d => `${d.month}: ${d.applications} applications, ${d.enrolled} enrolled`).join('\n')}

Provide: predictedEnrollment, confidence (0-1), byClass distribution, trend, seasonalFactors.
Respond as JSON.`

    const response = await executeStructuredAI<EnrollmentForecast>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Enrollment Forecasting'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          predictedEnrollment: d.predictedEnrollment ?? 0,
          confidence: Math.min(Math.max(d.confidence ?? 0.5, 0), 1),
          byClass: d.byClass ?? {},
          trend: d.trend ?? 'stable',
          seasonalFactors: d.seasonalFactors ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── optimizeClassComposition — Balanced class creation ──

  async optimizeClassComposition(applicants: Array<{ id: string; name: string; academicScore: number; gender?: string; specialNeeds?: string[] }>): Promise<ClassCompositionResult> {
    const prompt = `Optimize class composition for balanced classes from these applicants:

${applicants.map(a => `- ${a.name}: Score ${a.academicScore}, Gender: ${a.gender ?? 'N/A'}, Special Needs: ${a.specialNeeds?.join(', ') ?? 'None'}`).join('\n')}

Create balanced classes considering: academic mix, gender balance, special needs distribution.
Provide: classes (with className, student IDs, balanceScore 0-1), overallBalance, recommendations.
Respond as JSON.`

    const response = await executeStructuredAI<ClassCompositionResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Class Composition'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          classes: d.classes ?? [],
          overallBalance: d.overallBalance ?? 0.5,
          recommendations: d.recommendations ?? [],
        }
      }
    )

    return response.parsed
  }

  // ── generateOfferLetters — Offer letter generation ──

  async generateOfferLetters(accepted: Array<{ studentName: string; class: string; deadline: string }>): Promise<Array<{ studentName: string; letterContent: string }>> {
    const prompt = `Generate personalized offer letters for these accepted students:

${accepted.map(a => `- ${a.studentName}: Class ${a.class}, Deadline: ${a.deadline}`).join('\n')}

Each letter should be professional, welcoming, and include: congratulations, class assignment, deadline, next steps, contact information.
Respond as JSON array: [{ "studentName": "...", "letterContent": "..." }]`

    const response = await executeStructuredAI<Array<{ studentName: string; letterContent: string }>>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Offer Letters'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.6,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(d) ? d : d.letters ?? []
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated ${accepted.length} offer letters`, 0.5, this.context)

    return response.parsed
  }

  // ── scheduleOrientation — Orientation scheduling ──

  async scheduleOrientation(newStudents: Array<{ studentName: string; class: string; parentContact?: string }>): Promise<{ date: string; schedule: Array<{ time: string; activity: string }>; groups: Record<string, string[]> }> {
    const prompt = `Create an orientation schedule for ${newStudents.length} new students:

Students: ${newStudents.map(s => `${s.studentName} (Class: ${s.class})`).join(', ')}

Design a welcoming orientation with: date, time slots, activities, and grouping by class.
Respond as JSON: { "date": "...", "schedule": [{ "time": "...", "activity": "..." }], "groups": { "Class1": ["student1", ...] } }`

    const response = await executeStructuredAI<{ date: string; schedule: Array<{ time: string; activity: string }>; groups: Record<string, string[]> }>(
      {
        prompt,
        systemPrompt: getSystemPrompt('school_admin', 'Orientation Planning'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.5,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          date: d.date ?? new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          schedule: d.schedule ?? [],
          groups: d.groups ?? {},
        }
      }
    )

    return response.parsed
  }

  // ── trackConversionRates — Admission funnel analytics ──

  async trackConversionRates(period: string): Promise<ConversionAnalytics> {
    const supabase = await createClient()

    const { data: applications } = await supabase
      .from('admissions_applications')
      .select('status, source, created_at')
      .gte('created_at', new Date(Date.now() - 365 * 86400000).toISOString())

    const total = applications?.length ?? 0
    const accepted = applications?.filter(a => a.status === 'accepted').length ?? 0
    const enrolled = applications?.filter(a => a.status === 'enrolled').length ?? 0

    const bySource: Record<string, { applications: number; enrolled: number; rate: number }> = {}
    for (const app of applications ?? []) {
      const source = app.source ?? 'unknown'
      if (!bySource[source]) bySource[source] = { applications: 0, enrolled: 0, rate: 0 }
      bySource[source].applications++
      if (app.status === 'enrolled') bySource[source].enrolled++
    }
    for (const key of Object.keys(bySource)) {
      bySource[key].rate = bySource[key].applications > 0 ? bySource[key].enrolled / bySource[key].applications : 0
    }

    return {
      totalApplications: total,
      accepted,
      enrolled,
      conversionRate: total > 0 ? enrolled / total : 0,
      bySource,
      dropoffPoints: [
        { stage: 'application_to_acceptance', dropoffPercent: total > 0 ? ((total - accepted) / total) * 100 : 0 },
        { stage: 'acceptance_to_enrollment', dropoffPercent: accepted > 0 ? ((accepted - enrolled) / accepted) * 100 : 0 },
      ],
    }
  }
}
