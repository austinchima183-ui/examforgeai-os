// ============================================================================
// ExamForge AI Orchestration — Teacher Agent
// ============================================================================
// Autonomous teacher agent that can: remember, plan, delegate, schedule,
// communicate, and execute workflows for teaching tasks.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from '@/lib/ai/ai-engine'
import { storeMemory, retrieveMemories } from '../agent-memory'
import { createPlan, getNextStep, updatePlanStep } from '../agent-planner'
import { sendMessage, requestDelegation, escalateToHuman } from '../agent-communicator'
import type { AgentContext, AgentConfig, AgentExecutionResult } from '../types'

// ──────────────────────────────────────────────────────────────
// Input/Output Types
// ──────────────────────────────────────────────────────────────

export interface LessonPlanContext {
  subject: string
  topic: string
  classLevel: string
  duration: string
  objectives?: string[]
  curriculum?: string
  previousTopics?: string[]
  studentPerformance?: string
}

export interface LessonPlanResult {
  title: string
  objectives: string[]
  materials: string[]
  introduction: { activity: string; duration: string }
  mainActivities: Array<{ activity: string; duration: string; notes: string }>
  conclusion: { activity: string; duration: string }
  assessment: string[]
  homework: string[]
  differentiation: { struggling: string[]; advanced: string[] }
  curriculumAlignment: { aligned: boolean; gaps: string[]; standards: string[] }
}

export interface ExamContext {
  subject: string
  topic: string
  questionTypes: string[]
  difficulty: string
  count: number
  examBody?: string
  curriculum?: string
  classLevel?: string
}

export interface ExamResult {
  questions: Array<{
    type: string
    content: string
    options?: Array<{ id: string; text: string; isCorrect: boolean }>
    correctAnswer: string
    explanation: string
    difficulty: string
    marks: number
  }>
  blueprint: { totalMarks: number; topicDistribution: Record<string, number>; difficultyDistribution: Record<string, number> }
}

export interface StudentAssessmentInput {
  studentId: string
  studentName: string
  recentScores: Array<{ exam: string; score: number; maxScore: number; date: string }>
  attendanceRate: number
  behaviorNotes?: string[]
}

export interface StudentAssessmentResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  identifiedIssues: string[]
  interventions: Array<{ intervention: string; priority: string; timeline: string }>
  parentCommunicationSuggestion: string
  monitoringPlan: string
}

export interface SubmissionInput {
  question: string
  correctAnswer: string
  studentAnswer: string
  marks: number
  markingScheme?: string
}

export interface SubmissionResult {
  marksAwarded: number
  maxMarks: number
  feedback: string
  strengths: string[]
  improvements: string[]
  isCorrect: boolean
}

export interface ClassReportResult {
  summary: string
  averageScore: number
  passRate: number
  topPerformers: string[]
  strugglingStudents: string[]
  trends: string[]
  recommendations: string[]
}

// ──────────────────────────────────────────────────────────────
// TeacherAgent Class
// ──────────────────────────────────────────────────────────────

export class TeacherAgent {
  private config: AgentConfig
  private context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  get agentId(): string {
    return this.context.agentId
  }

  // ── generateLessonPlan — With curriculum alignment check ──

  async generateLessonPlan(input: LessonPlanContext): Promise<LessonPlanResult> {
    const memories = await retrieveMemories(this.agentId, `lesson plan ${input.subject} ${input.topic}`, 5)
    const memoryContext = memories.length > 0
      ? `\n\nPrevious relevant experience:\n${memories.map(m => m.content).join('\n')}`
      : ''

    const prompt = `Generate a detailed lesson plan with curriculum alignment:

Subject: ${input.subject}
Topic: ${input.topic}
Class Level: ${input.classLevel}
Duration: ${input.duration}
${input.curriculum ? `Curriculum: ${input.curriculum}` : ''}
${input.objectives?.length ? `Objectives: ${input.objectives.join(', ')}` : ''}
${input.previousTopics?.length ? `Previous Topics: ${input.previousTopics.join(', ')}` : ''}
${input.studentPerformance ? `Student Performance: ${input.studentPerformance}` : ''}
${memoryContext}

Include curriculum alignment analysis with specific standards covered and any gaps.`

    const response = await executeStructuredAI<LessonPlanResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Lesson Planner'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.6,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          title: d.title ?? `${input.subject}: ${input.topic}`,
          objectives: d.objectives ?? [],
          materials: d.materials ?? [],
          introduction: d.introduction ?? { activity: '', duration: '5 min' },
          mainActivities: d.mainActivities ?? [],
          conclusion: d.conclusion ?? { activity: '', duration: '5 min' },
          assessment: d.assessment ?? [],
          homework: d.homework ?? [],
          differentiation: d.differentiation ?? { struggling: [], advanced: [] },
          curriculumAlignment: d.curriculumAlignment ?? { aligned: true, gaps: [], standards: [] },
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated lesson plan: ${input.subject} - ${input.topic} for ${input.classLevel}`, 0.6, this.context)

    return response.parsed
  }

  // ── createExam — Question generation + blueprint ──

  async createExam(input: ExamContext): Promise<ExamResult> {
    const prompt = `Generate an exam with the following specifications:

Subject: ${input.subject}
Topic: ${input.topic}
Question Types: ${input.questionTypes.join(', ')}
Difficulty: ${input.difficulty}
Number of Questions: ${input.count}
${input.examBody ? `Exam Body: ${input.examBody}` : ''}
${input.curriculum ? `Curriculum: ${input.curriculum}` : ''}
${input.classLevel ? `Class Level: ${input.classLevel}` : ''}

For each question provide: type, content, options (for MCQ with id, text, isCorrect), correctAnswer, explanation, difficulty, marks.
Also provide an exam blueprint with total marks, topic distribution, and difficulty distribution.

Respond as JSON: { "questions": [...], "blueprint": { "totalMarks": 0, "topicDistribution": {}, "difficultyDistribution": {} } }`

    const response = await executeStructuredAI<ExamResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Exam Creation'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.5,
        maxTokens: 4096,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          questions: d.questions ?? [],
          blueprint: d.blueprint ?? { totalMarks: 0, topicDistribution: {}, difficultyDistribution: {} },
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Created exam: ${input.subject} - ${input.topic} with ${input.count} questions`, 0.7, this.context)

    return response.parsed
  }

  // ── assessStudent — Performance analysis + interventions ──

  async assessStudent(input: StudentAssessmentInput): Promise<StudentAssessmentResult> {
    const prompt = `Analyze student performance and suggest interventions:

Student: ${input.studentName}
Recent Scores: ${input.recentScores.map(s => `${s.exam}: ${s.score}/${s.maxScore} (${((s.score / s.maxScore) * 100).toFixed(1)}%)`).join('; ')}
Attendance Rate: ${(input.attendanceRate * 100).toFixed(1)}%
${input.behaviorNotes?.length ? `Behavior Notes: ${input.behaviorNotes.join('; ')}` : ''}

Provide: riskLevel (low/medium/high/critical), identifiedIssues, interventions with priority and timeline, parentCommunicationSuggestion, monitoringPlan.

Respond as JSON.`

    const response = await executeStructuredAI<StudentAssessmentResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Student Assessment'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          riskLevel: d.riskLevel ?? 'medium',
          identifiedIssues: d.identifiedIssues ?? [],
          interventions: d.interventions ?? [],
          parentCommunicationSuggestion: d.parentCommunicationSuggestion ?? '',
          monitoringPlan: d.monitoringPlan ?? '',
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Assessed student ${input.studentName}: risk=${response.parsed.riskLevel}`, response.parsed.riskLevel === 'critical' ? 0.9 : 0.6, this.context)

    return response.parsed
  }

  // ── identifyStrugglingStudents — Risk prediction for a class ──

  async identifyStrugglingStudents(classData: Array<{ studentId: string; studentName: string; avgScore: number; attendanceRate: number }>): Promise<Array<{ studentId: string; riskScore: number; factors: string[] }>> {
    const prompt = `Identify struggling students from this class data:

${classData.map((s, i) => `Student ${i + 1}: ${s.studentName} — Avg Score: ${s.avgScore.toFixed(1)}%, Attendance: ${(s.attendanceRate * 100).toFixed(1)}%`).join('\n')}

For each student at risk (score < 50% or attendance < 80%), provide: studentId, riskScore (0-100), factors.
Respond as JSON array.`

    const response = await executeStructuredAI<Array<{ studentId: string; riskScore: number; factors: string[] }>>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Risk Prediction'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.3,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(d) ? d : d.students ?? []
      }
    )

    if (response.parsed.length > 0) {
      await storeMemory(this.agentId, 'episodic', `Identified ${response.parsed.length} struggling students`, 0.8, this.context)
    }

    return response.parsed
  }

  // ── recommendInterventions — Personalized interventions ──

  async recommendInterventions(students: Array<{ studentId: string; studentName: string; issues: string[] }>): Promise<Array<{ studentId: string; interventions: string[]; timeline: string }>> {
    const prompt = `Recommend personalized interventions for these students:

${students.map(s => `- ${s.studentName}: Issues: ${s.issues.join(', ')}`).join('\n')}

For each student, provide: studentId, interventions (specific, actionable), timeline.
Respond as JSON array.`

    const response = await executeStructuredAI<Array<{ studentId: string; interventions: string[]; timeline: string }>>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Interventions'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.5,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(d) ? d : d.recommendations ?? []
      }
    )

    return response.parsed
  }

  // ── markSubmission — AI-assisted marking ──

  async markSubmission(input: SubmissionInput): Promise<SubmissionResult> {
    const prompt = `Mark this student submission:

Question: ${input.question}
Correct Answer: ${input.correctAnswer}
Student Answer: ${input.studentAnswer}
Maximum Marks: ${input.marks}
${input.markingScheme ? `Marking Scheme: ${input.markingScheme}` : ''}

Provide: marksAwarded (0-${input.marks}), feedback, strengths, improvements, isCorrect.
Respond as JSON.`

    const response = await executeStructuredAI<SubmissionResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Grading'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.2,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          marksAwarded: Math.min(Math.max(d.marksAwarded ?? 0, 0), input.marks),
          maxMarks: input.marks,
          feedback: d.feedback ?? '',
          strengths: d.strengths ?? [],
          improvements: d.improvements ?? [],
          isCorrect: d.isCorrect ?? false,
        }
      }
    )

    return response.parsed
  }

  // ── generateReport — Class performance report ──

  async generateReport(
    classData: { className: string; studentCount: number; avgScore: number; passRate: number; topStudents: string[]; strugglingStudents: string[] },
    period: string
  ): Promise<ClassReportResult> {
    const prompt = `Generate a class performance report:

Class: ${classData.className}
Period: ${period}
Students: ${classData.studentCount}
Average Score: ${classData.avgScore.toFixed(1)}%
Pass Rate: ${(classData.passRate * 100).toFixed(1)}%
Top Performers: ${classData.topStudents.join(', ')}
Struggling Students: ${classData.strugglingStudents.join(', ')}

Provide: summary, averageScore, passRate, topPerformers, strugglingStudents, trends, recommendations.
Respond as JSON.`

    const response = await executeStructuredAI<ClassReportResult>(
      {
        prompt,
        systemPrompt: getSystemPrompt('teacher', 'Class Report'),
        userId: this.context.userId,
        schoolId: this.context.schoolId,
        temperature: 0.4,
      },
      (raw) => {
        const d = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
          summary: d.summary ?? '',
          averageScore: d.averageScore ?? classData.avgScore,
          passRate: d.passRate ?? classData.passRate,
          topPerformers: d.topPerformers ?? classData.topStudents,
          strugglingStudents: d.strugglingStudents ?? classData.strugglingStudents,
          trends: d.trends ?? [],
          recommendations: d.recommendations ?? [],
        }
      }
    )

    await storeMemory(this.agentId, 'episodic', `Generated class report for ${classData.className} (${period})`, 0.5, this.context)

    return response.parsed
  }

  // ── coordinateWithOtherAgents — Delegate to Principal/Scheduling agents ──

  async coordinateWithOtherAgents(task: { targetAgentType: string; task: string; priority: 'low' | 'normal' | 'high' | 'critical' }): Promise<{ delegationId: string; status: string }> {
    const supabase = await createClient()

    // Find an agent of the target type
    const { data: targetAgent } = await supabase
      .from('agent_configs')
      .select('id')
      .eq('type', task.targetAgentType)
      .eq('enabled', true)
      .limit(1)
      .single()

    if (!targetAgent) {
      // Escalate to human if no suitable agent found
      await escalateToHuman(this.agentId, `No ${task.targetAgentType} agent available for task: ${task.task}`, task.priority === 'critical' ? 'critical' : 'high', this.context)
      return { delegationId: '', status: 'escalated' }
    }

    const delegation = await requestDelegation(this.agentId, targetAgent.id, task.task, undefined, this.context)

    return { delegationId: delegation.id, status: delegation.status }
  }
}
