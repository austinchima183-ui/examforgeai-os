// ============================================================================
// ExamForge AI Teacher — Intelligent Teaching Assistant
// ============================================================================
// Production-ready AI-powered workflows for teachers:
// - Lesson plan generation
// - Exam/question generation from curriculum
// - Rubric building
// - Assignment marking
// - Student intervention suggestions
// - Struggling student prediction
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from './ai-engine'
import type { QuestionType, DifficultyLevel, ExamBodyType } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface LessonPlanRequest {
  subject: string
  topic: string
  classLevel: string
  duration: string // e.g., "45 minutes"
  objectives?: string[]
  curriculum?: string // e.g., "WAEC", "NECO"
  previousTopics?: string[]
  studentPerformance?: string // e.g., "mixed ability", "advanced"
}

export interface LessonPlanResponse {
  title: string
  objectives: string[]
  materials: string[]
  introduction: { activity: string; duration: string }
  mainActivities: Array<{ activity: string; duration: string; notes: string }>
  conclusion: { activity: string; duration: string }
  assessment: string[]
  homework: string[]
  differentiation: { struggling: string[]; advanced: string[] }
  crossCurricularLinks: string[]
}

export interface QuestionGenerationRequest {
  subject: string
  topic: string
  questionTypes: QuestionType[]
  difficulty: DifficultyLevel
  count: number
  examBody?: ExamBodyType
  curriculum?: string
  classLevel?: string
  specificContent?: string // Teacher's notes/content to base questions on
  marksPerQuestion?: number
}

export interface GeneratedQuestion {
  type: QuestionType
  content: string
  options?: Array<{ id: string; text: string; isCorrect: boolean }>
  correctAnswer: string
  explanation: string
  difficulty: DifficultyLevel
  marks: number
  tags: string[]
}

export interface RubricRequest {
  assignmentTitle: string
  subject: string
  classLevel: string
  criteria: string[]
  maxMarks: number
  assignmentDescription?: string
}

export interface RubricResponse {
  title: string
  criteria: Array<{
    name: string
    description: string
    levels: Array<{ level: string; marks: number; description: string }>
  }>
  totalMarks: number
  feedbackGuidelines: string
}

export interface MarkingRequest {
  question: string
  correctAnswer: string
  studentAnswer: string
  marks: number
  markingScheme?: string
  rubric?: RubricResponse
}

export interface MarkingResponse {
  marksAwarded: number
  maxMarks: number
  feedback: string
  strengths: string[]
  improvements: string[]
  isCorrect: boolean
}

export interface InterventionRequest {
  studentId: string
  studentName: string
  subject: string
  recentScores: Array<{ exam: string; score: number; maxScore: number; date: string }>
  attendanceRate: number
  behaviorNotes?: string[]
}

export interface InterventionResponse {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  identifiedIssues: string[]
  recommendedInterventions: Array<{
    intervention: string
    priority: 'low' | 'medium' | 'high'
    timeline: string
    resources: string[]
  }>
  parentCommunicationSuggestion: string
  monitoringPlan: string
}

export interface StudentRiskPrediction {
  studentId: string
  studentName: string
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  primaryFactors: string[]
  predictedOutcome: string
  recommendedActions: string[]
}

// ──────────────────────────────────────────────────────────────
// Lesson Plan Generation
// ──────────────────────────────────────────────────────────────

export async function generateLessonPlan(
  request: LessonPlanRequest,
  userId: string,
  schoolId?: string | null
): Promise<LessonPlanResponse> {
  const prompt = `Generate a detailed lesson plan for the following:

Subject: ${request.subject}
Topic: ${request.topic}
Class Level: ${request.classLevel}
Duration: ${request.duration}
${request.curriculum ? `Curriculum: ${request.curriculum}` : ''}
${request.objectives?.length ? `Learning Objectives to Cover: ${request.objectives.join(', ')}` : ''}
${request.previousTopics?.length ? `Previously Covered Topics: ${request.previousTopics.join(', ')}` : ''}
${request.studentPerformance ? `Student Performance Level: ${request.studentPerformance}` : ''}

Generate a comprehensive lesson plan with:
1. Clear learning objectives (3-5 specific, measurable objectives)
2. Required materials and resources
3. Introduction/hook activity (engaging opener)
4. Main teaching activities (2-3 activities with durations)
5. Conclusion/plenary activity
6. Assessment strategies (formative checks)
7. Homework/extension activities
8. Differentiation strategies for struggling and advanced students
9. Cross-curricular links

Respond as JSON matching the LessonPlanResponse structure.`

  const response = await executeStructuredAI<LessonPlanResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Lesson Planner'),
      userId,
      schoolId,
      metadata: { type: 'lesson_plan', subject: request.subject, topic: request.topic },
      questionTracking: { inputParams: request as unknown as Record<string, unknown> },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        title: data.title ?? `${request.subject}: ${request.topic}`,
        objectives: data.objectives ?? [],
        materials: data.materials ?? [],
        introduction: data.introduction ?? { activity: '', duration: '5 min' },
        mainActivities: data.mainActivities ?? [],
        conclusion: data.conclusion ?? { activity: '', duration: '5 min' },
        assessment: data.assessment ?? [],
        homework: data.homework ?? [],
        differentiation: data.differentiation ?? { struggling: [], advanced: [] },
        crossCurricularLinks: data.crossCurricularLinks ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Question Generation
// ──────────────────────────────────────────────────────────────

export async function generateQuestions(
  request: QuestionGenerationRequest,
  userId: string,
  schoolId?: string | null
): Promise<GeneratedQuestion[]> {
  const prompt = `Generate ${request.count} exam questions with the following specifications:

Subject: ${request.subject}
Topic: ${request.topic}
Question Types: ${request.questionTypes.join(', ')}
Difficulty Level: ${request.difficulty}
${request.examBody ? `Exam Body: ${request.examBody}` : ''}
${request.curriculum ? `Curriculum: ${request.curriculum}` : ''}
${request.classLevel ? `Class Level: ${request.classLevel}` : ''}
${request.specificContent ? `Base questions on this content:\n${request.specificContent}` : ''}
${request.marksPerQuestion ? `Marks per question: ${request.marksPerQuestion}` : ''}

For each question provide:
- type: one of ${request.questionTypes.map(t => `"${t}"`).join(', ')}
- content: the question text
- options: for single_choice/multi_choice/multi_select, provide 4 options with id (A/B/C/D), text, and isCorrect boolean
- correctAnswer: the correct answer
- explanation: detailed explanation of why the answer is correct
- difficulty: "${request.difficulty}"
- marks: ${request.marksPerQuestion ?? 2}
- tags: relevant topic tags

Ensure questions are:
1. Educationally sound and aligned to the ${request.curriculum ?? 'standard'} curriculum
2. Varied in approach (not all testing the same concept the same way)
3. Clear and unambiguous
4. Have plausible distractors for MCQ (common misconceptions)
5. Progressive in difficulty within the specified level

Respond as a JSON array of question objects.`

  const response = await executeStructuredAI<GeneratedQuestion[]>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Question Bank'),
      userId,
      schoolId,
      metadata: {
        type: 'question_generation',
        subject: request.subject,
        topic: request.topic,
        count: request.count,
      },
      questionTracking: {
        inputParams: request as unknown as Record<string, unknown>,
      },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const questions = Array.isArray(data) ? data : data.questions ?? []
      return questions.map((q: Record<string, unknown>) => ({
        type: q.type as QuestionType ?? 'single_choice',
        content: (q.content as string) ?? '',
        options: q.options as Array<{ id: string; text: string; isCorrect: boolean }> ?? undefined,
        correctAnswer: (q.correctAnswer as string) ?? '',
        explanation: (q.explanation as string) ?? '',
        difficulty: (q.difficulty as DifficultyLevel) ?? request.difficulty,
        marks: (q.marks as number) ?? request.marksPerQuestion ?? 2,
        tags: (q.tags as string[]) ?? [request.subject, request.topic],
      }))
    }
  )

  // Track question generation counts
  // (Ω-15: logged, never silent — pre-008 schemas lack these columns and the
  //  failure used to be swallowed completely.)
  const supabase = await createClient()
  const questionTrackingUpdate = await supabase
    .from('ai_generation_requests')
    .update({
      questions_generated: request.count,
      questions_accepted: response.parsed.length,
      questions_rejected: request.count - response.parsed.length,
    })
    .eq('id', response.generationId)
  if (questionTrackingUpdate.error) {
    console.warn(
      '[AI Teacher] question-count tracking update failed (migration 008 pending?):',
      questionTrackingUpdate.error.message
    )
  }

  return response.parsed
}

/**
 * Save generated questions to the database.
 */
export async function saveGeneratedQuestions(
  questions: GeneratedQuestion[],
  generationId: string,
  userId: string,
  schoolId?: string | null,
  subjectId?: string | null,
  topicId?: string | null
): Promise<{ saved: number; errors: number }> {
  const supabase = await createClient()
  let saved = 0
  let errors = 0

  for (const q of questions) {
    // Live schema: AI-generated questions pending teacher review live in
    // `ai_generated_questions` (review pipeline table). Approved items are
    // promoted into `question_bank`; exam-scoped rows live in `questions`.
    const insert = {
      generation_request_id: generationId,
      school_id: schoolId ?? null,
      question_type: q.type,
      difficulty: q.difficulty,
      content: q.content,
      content_json: {
        options: q.options ?? null,
        correctAnswer: q.correctAnswer,
      },
      answer_options: q.options ?? null,
      explanation: q.explanation,
      marks: q.marks,
      review_status: 'pending',
      metadata: {
        createdBy: userId,
        subjectId: subjectId ?? null,
        topicId: topicId ?? null,
        tags: q.tags ?? [],
      } as Record<string, unknown>,
    }

    const { error } = await supabase.from('ai_generated_questions').insert(insert)
    if (error) errors++
    else saved++
  }

  return { saved, errors }
}

// ──────────────────────────────────────────────────────────────
// Rubric Generation
// ──────────────────────────────────────────────────────────────

export async function generateRubric(
  request: RubricRequest,
  userId: string,
  schoolId?: string | null
): Promise<RubricResponse> {
  const prompt = `Generate a detailed assessment rubric for:

Assignment: ${request.assignmentTitle}
Subject: ${request.subject}
Class Level: ${request.classLevel}
Maximum Marks: ${request.maxMarks}
Criteria to Assess: ${request.criteria.join(', ')}
${request.assignmentDescription ? `Assignment Description: ${request.assignmentDescription}` : ''}

Create a rubric with:
1. Each criterion broken into 4 performance levels (Excellent, Good, Satisfactory, Needs Improvement)
2. Clear, specific descriptors for each level
3. Mark allocation that sums to ${request.maxMarks}
4. Feedback guidelines for teachers

Respond as JSON matching the RubricResponse structure.`

  const response = await executeStructuredAI<RubricResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Rubric Builder'),
      userId,
      schoolId,
      metadata: { type: 'rubric_generation', subject: request.subject },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        title: data.title ?? request.assignmentTitle,
        criteria: data.criteria ?? [],
        totalMarks: data.totalMarks ?? request.maxMarks,
        feedbackGuidelines: data.feedbackGuidelines ?? '',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// AI-Assisted Marking
// ──────────────────────────────────────────────────────────────

export async function markAnswer(
  request: MarkingRequest,
  userId: string,
  schoolId?: string | null
): Promise<MarkingResponse> {
  const prompt = `Mark the following student answer:

Question: ${request.question}
Correct Answer: ${request.correctAnswer}
Student Answer: ${request.studentAnswer}
Maximum Marks: ${request.marks}
${request.markingScheme ? `Marking Scheme: ${request.markingScheme}` : ''}
${request.rubric ? `Rubric Criteria: ${JSON.stringify(request.rubric.criteria)}` : ''}

Provide:
1. marksAwarded: how many marks to award (0 to ${request.marks})
2. feedback: specific, constructive feedback explaining the marks
3. strengths: what the student did well
4. improvements: specific areas to improve
5. isCorrect: whether the answer is fully correct

Be fair but rigorous. Award partial marks for partially correct answers.
For essay/long answers, evaluate understanding, accuracy, structure, and completeness.

Respond as JSON matching the MarkingResponse structure.`

  const response = await executeStructuredAI<MarkingResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Grading'),
      userId,
      schoolId,
      metadata: { type: 'ai_marking', marks: request.marks },
      temperature: 0.3, // More deterministic for marking
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        marksAwarded: Math.min(Math.max(data.marksAwarded ?? 0, 0), request.marks),
        maxMarks: request.marks,
        feedback: data.feedback ?? '',
        strengths: data.strengths ?? [],
        improvements: data.improvements ?? [],
        isCorrect: data.isCorrect ?? false,
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Student Intervention Suggestions
// ──────────────────────────────────────────────────────────────

export async function suggestInterventions(
  request: InterventionRequest,
  userId: string,
  schoolId?: string | null
): Promise<InterventionResponse> {
  const prompt = `Analyze this student's performance and suggest interventions:

Student: ${request.studentName}
Subject: ${request.subject}
Recent Scores: ${request.recentScores.map(s => `${s.exam}: ${s.score}/${s.maxScore} (${((s.score/s.maxScore)*100).toFixed(1)}%) on ${s.date}`).join('; ')}
Attendance Rate: ${(request.attendanceRate * 100).toFixed(1)}%
${request.behaviorNotes?.length ? `Behavior Notes: ${request.behaviorNotes.join('; ')}` : ''}

Analyze:
1. Risk level (low/medium/high/critical) based on score trends and attendance
2. Specific identified issues (e.g., "declining math scores", "poor attendance")
3. Recommended interventions with priority and timeline
4. Suggested parent communication
5. Monitoring plan to track improvement

Be specific and actionable. Consider both academic and non-academic factors.
Respond as JSON matching the InterventionResponse structure.`

  const response = await executeStructuredAI<InterventionResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Student Interventions'),
      userId,
      schoolId,
      metadata: { type: 'intervention_suggestion', studentId: request.studentId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        riskLevel: data.riskLevel ?? 'medium',
        identifiedIssues: data.identifiedIssues ?? [],
        recommendedInterventions: data.recommendedInterventions ?? [],
        parentCommunicationSuggestion: data.parentCommunicationSuggestion ?? '',
        monitoringPlan: data.monitoringPlan ?? '',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Predict Struggling Students
// ──────────────────────────────────────────────────────────────

export async function predictStrugglingStudents(
  classId: string,
  userId: string,
  schoolId?: string | null
): Promise<StudentRiskPrediction[]> {
  const supabase = await createClient()

  // ── Fetch real data for the class ──
  const [enrollmentsResult, sessionsResult, attendanceResult] = await Promise.all([
    supabase
      .from('class_students')
      .select('student_id, profiles!class_enrollments_student_id_fkey(id, full_name)')
      .eq('class_id', classId)
      .eq('is_active', true),
    supabase
      .from('exam_sessions')
      .select('student_id, percentage, total_score, max_score, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('student_id, status, date')
      .eq('class_id', classId)
      .order('date', { ascending: false })
      .limit(30),
  ])

  const enrollments = enrollmentsResult.data ?? []
  const sessions = sessionsResult.data ?? []
  const attendance = attendanceResult.data ?? []

  // Build student data profiles
  const studentProfiles = enrollments.map((e) => {
    const studentId = e.student_id
    const studentName = (e.profiles as unknown as Record<string, unknown>)?.full_name as string ?? 'Unknown'

    const studentSessions = sessions.filter((s) => s.student_id === studentId)
    const studentAttendance = attendance.filter((a) => a.student_id === studentId)

    const avgScore = studentSessions.length > 0
      ? studentSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / studentSessions.length
      : null
    const attendanceRate = studentAttendance.length > 0
      ? studentAttendance.filter((a) => a.status === 'present').length / studentAttendance.length
      : null
    const recentScores = studentSessions.slice(0, 5).map((s) => s.percentage ?? 0)
    const scoreTrend = recentScores.length >= 2
      ? recentScores[0] - recentScores[recentScores.length - 1]
      : 0

    return { studentId, studentName, avgScore, attendanceRate, recentScores, scoreTrend, sessionCount: studentSessions.length }
  })

  const prompt = `Analyze these students' data and predict which ones are at risk of struggling or dropping out:

${studentProfiles.map((s, i) => `
Student ${i + 1}: ${s.studentName}
- Average Score: ${s.avgScore !== null ? `${s.avgScore.toFixed(1)}%` : 'No data'}
- Attendance Rate: ${s.attendanceRate !== null ? `${(s.attendanceRate * 100).toFixed(1)}%` : 'No data'}
- Recent Scores (most recent first): [${s.recentScores.map(sc => sc.toFixed(1)).join(', ')}]
- Score Trend (positive = improving): ${s.scoreTrend > 0 ? '+' : ''}${s.scoreTrend.toFixed(1)}
- Total Exam Sessions: ${s.sessionCount}
`).join('\n')}

For each student, provide:
1. riskScore (0-100, where 100 = highest risk)
2. riskLevel (low/medium/high/critical)
3. primaryFactors (what's driving the risk)
4. predictedOutcome (e.g., "likely to fail next exam", "stable performance")
5. recommendedActions (specific, actionable steps)

Consider:
- Scores below 50% are concerning
- Attendance below 80% is concerning
- Declining score trends are concerning
- Low exam participation suggests disengagement

Respond as a JSON array of StudentRiskPrediction objects.`

  const response = await executeStructuredAI<StudentRiskPrediction[]>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Student Risk Prediction'),
      userId,
      schoolId,
      metadata: { type: 'risk_prediction', classId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const predictions = Array.isArray(data) ? data : data.predictions ?? []
      return predictions.map((p: Record<string, unknown>, i: number) => ({
        studentId: studentProfiles[i]?.studentId ?? (p.studentId as string),
        studentName: studentProfiles[i]?.studentName ?? (p.studentName as string),
        riskScore: Math.min(Math.max(p.riskScore as number ?? 50, 0), 100),
        riskLevel: p.riskLevel as StudentRiskPrediction['riskLevel'] ?? 'medium',
        primaryFactors: (p.primaryFactors as string[]) ?? [],
        predictedOutcome: (p.predictedOutcome as string) ?? '',
        recommendedActions: (p.recommendedActions as string[]) ?? [],
      }))
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Worksheet Generation
// ──────────────────────────────────────────────────────────────

export interface WorksheetRequest {
  subject: string
  topic: string
  classLevel: string
  questionCount: number
  difficulty: DifficultyLevel
  includeAnswers?: boolean
  format?: 'mixed' | 'mcq_only' | 'written_only'
}

export async function generateWorksheet(
  request: WorksheetRequest,
  userId: string,
  schoolId?: string | null
): Promise<{ title: string; instructions: string; questions: GeneratedQuestion[]; answerKey: string }> {
  const prompt = `Generate a printable worksheet for:

Subject: ${request.subject}
Topic: ${request.topic}
Class Level: ${request.classLevel}
Number of Questions: ${request.questionCount}
Difficulty: ${request.difficulty}
Format: ${request.format ?? 'mixed'}
Include Answer Key: ${request.includeAnswers ?? true}

Create a well-structured worksheet with:
1. A clear title and instructions
2. Mix of question types (unless format specifies otherwise)
3. Progressive difficulty
4. Space for student name and date
5. Complete answer key with explanations

Respond as JSON with: { title, instructions, questions (array of GeneratedQuestion), answerKey (formatted string) }`

  const response = await executeStructuredAI<{
    title: string
    instructions: string
    questions: GeneratedQuestion[]
    answerKey: string
  }>(
    {
      prompt,
      systemPrompt: getSystemPrompt('teacher', 'Worksheet Builder'),
      userId,
      schoolId,
      metadata: { type: 'worksheet_generation', subject: request.subject },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        title: data.title ?? `${request.subject} Worksheet: ${request.topic}`,
        instructions: data.instructions ?? 'Answer all questions.',
        questions: data.questions ?? [],
        answerKey: data.answerKey ?? '',
      }
    }
  )

  return response.parsed
}
