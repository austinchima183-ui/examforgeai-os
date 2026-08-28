// ============================================================================
// ExamForge AI Student — Intelligent Student Tutor
// ============================================================================
// Production-ready AI-powered workflows for students:
// - Personal AI tutor
// - Study planner
// - Revision coach
// - Practice question generator
// - Weakness detector
// - Explain-anything mode
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from './ai-engine'
import type { QuestionType, DifficultyLevel } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface TutorSessionRequest {
  studentId: string
  subject: string
  topic: string
  question: string
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  studentLevel?: string
}

export interface TutorSessionResponse {
  explanation: string
  followUpQuestions: string[]
  relatedTopics: string[]
  practiceSuggestion: string
}

export interface StudyPlanRequest {
  studentId: string
  subjects: Array<{
    subject: string
    upcomingExams?: Array<{ title: string; date: string; weight: number }>
    currentPerformance?: number // 0-100
    priority?: 'low' | 'medium' | 'high'
  }>
  availableHoursPerDay: number
  studyStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic'
  examPeriodStart?: string
  examPeriodEnd?: string
}

export interface StudyPlanResponse {
  weeklySchedule: Array<{
    day: string
    sessions: Array<{
      subject: string
      topic: string
      duration: string
      activity: string
      priority: 'low' | 'medium' | 'high'
    }>
  }>
  focusAreas: Array<{ subject: string; reason: string; urgency: 'low' | 'medium' | 'high' }>
  tips: string[]
  breakSchedule: string
  totalWeeklyHours: number
}

export interface RevisionCoachRequest {
  studentId: string
  subject: string
  daysUntilExam: number
  topicsToCover: string[]
  knownWeaknesses: string[]
  performanceData?: Array<{ topic: string; score: number }>
}

export interface RevisionCoachResponse {
  dailyPlan: Array<{
    day: number
    topics: string[]
    activities: string[]
    duration: string
    focusLevel: 'light' | 'moderate' | 'intensive'
  }>
  priorityTopics: string[]
  revisionTechniques: string[]
  wellbeingReminders: string[]
  lastDayStrategy: string
}

export interface PracticeRequest {
  studentId: string
  subject: string
  topic: string
  difficulty: DifficultyLevel
  count: number
  questionTypes?: QuestionType[]
  weakAreasOnly?: boolean
}

export interface WeaknessDetectionRequest {
  studentId: string
  subject: string
}

export interface WeaknessReport {
  weakTopics: Array<{
    topic: string
    score: number
    trend: 'improving' | 'stable' | 'declining'
    severity: 'minor' | 'moderate' | 'severe'
    recommendation: string
  }>
  strongTopics: Array<{ topic: string; score: number; suggestion: string }>
  overallAssessment: string
  studyPriority: string[]
  estimatedImprovementTime: string
}

export interface ExplainRequest {
  concept: string
  subject: string
  studentLevel?: string
  learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic'
  previousKnowledge?: string[]
}

export interface ExplainResponse {
  explanation: string
  analogy: string
  realWorldExample: string
  keyPoints: string[]
  commonMisconceptions: string[]
  nextSteps: string[]
}

// ──────────────────────────────────────────────────────────────
// Personal AI Tutor
// ──────────────────────────────────────────────────────────────

export async function aiTutorChat(
  request: TutorSessionRequest,
  userId: string,
  schoolId?: string | null
): Promise<TutorSessionResponse> {
  // Build conversation context
  const conversationHistory = request.previousMessages?.map(
    (m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
  ).join('\n') ?? ''

  const prompt = `A student is asking for help in ${request.subject}, specifically about "${request.topic}".

Student's Question: "${request.question}"
${conversationHistory ? `Previous Conversation:\n${conversationHistory}` : ''}
${request.studentLevel ? `Student Level: ${request.studentLevel}` : ''}

As their personal AI tutor:
1. Explain the concept clearly, using simple language and analogies
2. Break it down step by step if it's complex
3. Provide 2-3 follow-up questions to check understanding
4. Suggest related topics they should also review
5. Recommend specific practice activities

Do NOT just give the answer if it's a problem—guide them to discover it.
Be encouraging and patient. Use examples from everyday life.

Respond as JSON: { explanation, followUpQuestions (array of strings), relatedTopics (array of strings), practiceSuggestion }`

  const response = await executeStructuredAI<TutorSessionResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'AI Tutor'),
      userId,
      schoolId,
      metadata: { type: 'tutor_session', subject: request.subject, topic: request.topic },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        explanation: data.explanation ?? '',
        followUpQuestions: data.followUpQuestions ?? [],
        relatedTopics: data.relatedTopics ?? [],
        practiceSuggestion: data.practiceSuggestion ?? '',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Study Planner
// ──────────────────────────────────────────────────────────────

export async function generateStudyPlan(
  request: StudyPlanRequest,
  userId: string,
  schoolId?: string | null
): Promise<StudyPlanResponse> {
  // Fetch real exam schedule and performance data
  const supabase = await createClient()
  const { data: upcomingExams } = await supabase
    .from('exams')
    .select('id, title, subject_id, start_time, subjects(name)')
    .eq('school_id', schoolId ?? '')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(20)

  const { data: recentSessions } = await supabase
    .from('exam_sessions')
    .select('exam_id, percentage, exams(title, subject_id, subjects(name))')
    .eq('student_id', request.studentId)
    .order('created_at', { ascending: false })
    .limit(30)

  const performanceSummary = recentSessions?.map(
    (s) => `${(s.exams as unknown as Record<string, unknown>)?.title ?? 'Exam'}: ${s.percentage?.toFixed(1) ?? 0}%`
  ).join(', ') ?? 'No recent exam data'

  const prompt = `Create a personalized weekly study plan for a student with the following profile:

Available Study Hours Per Day: ${request.availableHoursPerDay}
${request.studyStyle ? `Preferred Learning Style: ${request.studyStyle}` : ''}
${request.examPeriodStart ? `Exam Period: ${request.examPeriodStart} to ${request.examPeriodEnd}` : ''}

Subjects and Performance:
${request.subjects.map((s) => `
- ${s.subject}: Current performance ${s.currentPerformance ?? 'unknown'}%${s.priority ? `, Priority: ${s.priority}` : ''}${s.upcomingExams?.length ? `, Upcoming: ${s.upcomingExams.map(e => `${e.title} on ${e.date}`).join(', ')}` : ''}
`).join('')}

Recent Performance Data: ${performanceSummary}

Upcoming Exams from School:
${upcomingExams?.map((e) => `- ${(e.subjects as unknown as Record<string, unknown>)?.name ?? 'Unknown'}: ${e.title} on ${e.start_time}`).join('\n') ?? 'No upcoming exams'}

Create a realistic, balanced study plan that:
1. Prioritizes weaker subjects and upcoming exams
2. Includes varied activities (reading, practice, revision, testing)
3. Includes breaks and prevents burnout
4. Adapts to the student's available time
5. Builds in review sessions for previously studied material

Respond as JSON matching the StudyPlanResponse structure.`

  const response = await executeStructuredAI<StudyPlanResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'Study Planner'),
      userId,
      schoolId,
      metadata: { type: 'study_plan', subjectsCount: request.subjects.length },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        weeklySchedule: data.weeklySchedule ?? [],
        focusAreas: data.focusAreas ?? [],
        tips: data.tips ?? [],
        breakSchedule: data.breakSchedule ?? 'Take a 5-10 minute break every 25-30 minutes',
        totalWeeklyHours: data.totalWeeklyHours ?? request.availableHoursPerDay * 7,
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Revision Coach
// ──────────────────────────────────────────────────────────────

export async function revisionCoachPlan(
  request: RevisionCoachRequest,
  userId: string,
  schoolId?: string | null
): Promise<RevisionCoachResponse> {
  const prompt = `Create an intensive revision plan for a student preparing for an exam:

Subject: ${request.subject}
Days Until Exam: ${request.daysUntilExam}
Topics to Cover: ${request.topicsToCover.join(', ')}
Known Weaknesses: ${request.knownWeaknesses.join(', ') || 'None identified'}
${request.performanceData?.length ? `Performance by Topic: ${request.performanceData.map(p => `${p.topic}: ${p.score}%`).join(', ')}` : ''}

Create a day-by-day revision plan that:
1. Spreads topics across available days
2. Prioritizes weak areas with more time
3. Uses varied revision techniques (spaced repetition, practice questions, mind maps, teaching others)
4. Builds in increasingly frequent review of previously revised topics
5. Includes a final-day strategy (light review, not cramming)
6. Includes wellbeing reminders (sleep, hydration, breaks)

Respond as JSON matching the RevisionCoachResponse structure.`

  const response = await executeStructuredAI<RevisionCoachResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'Revision Hub'),
      userId,
      schoolId,
      metadata: { type: 'revision_plan', subject: request.subject, daysUntilExam: request.daysUntilExam },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        dailyPlan: data.dailyPlan ?? [],
        priorityTopics: data.priorityTopics ?? request.knownWeaknesses,
        revisionTechniques: data.revisionTechniques ?? [],
        wellbeingReminders: data.wellbeingReminders ?? ['Get 8 hours of sleep', 'Stay hydrated', 'Take regular breaks'],
        lastDayStrategy: data.lastDayStrategy ?? 'Light review of key formulas and concepts. Early bedtime.',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Practice Question Generator
// ──────────────────────────────────────────────────────────────

export async function generatePracticeQuestions(
  request: PracticeRequest,
  userId: string,
  schoolId?: string | null
): Promise<Array<{
  id: string
  type: QuestionType
  content: string
  options?: Array<{ id: string; text: string }>
  correctAnswer: string
  explanation: string
  difficulty: DifficultyLevel
}>> {
  // If weakAreasOnly, fetch the student's weak topics first
  let targetTopic = request.topic
  if (request.weakAreasOnly) {
    const weaknessReport = await detectWeaknesses(
      { studentId: request.studentId, subject: request.subject },
      userId,
      schoolId
    )
    const severeWeaknesses = weaknessReport.weakTopics
      .filter((w) => w.severity === 'severe' || w.severity === 'moderate')
      .map((w) => w.topic)
    if (severeWeaknesses.length > 0) {
      targetTopic = severeWeaknesses.join(', ')
    }
  }

  const prompt = `Generate ${request.count} practice questions for a student:

Subject: ${request.subject}
Topic: ${targetTopic}
Difficulty: ${request.difficulty}
Question Types: ${request.questionTypes?.join(', ') ?? 'mixed'}

Each question should:
1. Be at the appropriate difficulty level
2. Include a clear, detailed explanation of the correct answer
3. Help the student learn, not just test them
4. Build confidence with achievable challenges

Respond as a JSON array of question objects with: id, type, content, options (for MCQ), correctAnswer, explanation, difficulty.`

  const response = await executeStructuredAI<Array<{
    id: string
    type: QuestionType
    content: string
    options?: Array<{ id: string; text: string }>
    correctAnswer: string
    explanation: string
    difficulty: DifficultyLevel
  }>>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'Practice'),
      userId,
      schoolId,
      metadata: { type: 'practice_generation', subject: request.subject },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(data) ? data : data.questions ?? []
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Weakness Detector
// ──────────────────────────────────────────────────────────────

export async function detectWeaknesses(
  request: WeaknessDetectionRequest,
  userId: string,
  schoolId?: string | null
): Promise<WeaknessReport> {
  const supabase = await createClient()

  // Fetch real exam session data for this student in this subject
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select(`
      id, percentage, total_score, max_score, created_at,
      exams!inner(id, title, subject_id, subjects!inner(id, name))
    `)
    .eq('student_id', request.studentId)
    .eq('exams.subjects.name', request.subject)
    .order('created_at', { ascending: false })
    .limit(30)

  // Fetch wrong answers to identify specific weak areas
  const { data: wrongAnswers } = await supabase
    .from('exam_answers')
    .select(`
      id, is_correct, question_id, marks_awarded,
      questions!inner(id, content, topic_id, topics!inner(id, name))
    `)
    .eq('student_id', request.studentId)
    .eq('is_correct', false)

  // Build performance by topic map
  const topicPerformance = new Map<string, { correct: number; total: number }>()
  for (const answer of wrongAnswers ?? []) {
    const topicName = (answer.questions as unknown as Record<string, unknown>)?.topics as Record<string, unknown> | null
    const topicKey = (topicName?.name as string) ?? 'Unknown'
    const current = topicPerformance.get(topicKey) ?? { correct: 0, total: 0 }
    current.total++
    if (answer.is_correct) current.correct++
    topicPerformance.set(topicKey, current)
  }

  // Also add correct answers data
  const { data: correctAnswers } = await supabase
    .from('exam_answers')
    .select(`
      id, is_correct, question_id,
      questions!inner(id, topic_id, topics!inner(id, name))
    `)
    .eq('student_id', request.studentId)
    .eq('is_correct', true)

  for (const answer of correctAnswers ?? []) {
    const topicName = (answer.questions as unknown as Record<string, unknown>)?.topics as Record<string, unknown> | null
    const topicKey = (topicName?.name as string) ?? 'Unknown'
    const current = topicPerformance.get(topicKey) ?? { correct: 0, total: 0 }
    current.correct++
    current.total++
    topicPerformance.set(topicKey, current)
  }

  const performanceData = Array.from(topicPerformance.entries()).map(
    ([topic, { correct, total }]) => `${topic}: ${total > 0 ? ((correct / total) * 100).toFixed(1) : 0}% (${correct}/${total} correct)`
  ).join('\n')

  const overallPerformance = sessions?.length
    ? `Overall: ${sessions.reduce((s, e) => s + (e.percentage ?? 0), 0) / sessions.length}% average across ${sessions.length} exams`
    : 'No exam data available'

  const prompt = `Analyze this student's performance data to identify strengths and weaknesses:

Subject: ${request.subject}
Overall Performance: ${overallPerformance}

Performance by Topic:
${performanceData || 'No topic-level data available'}

Recent Exam Results:
${sessions?.slice(0, 10).map((s) => `- ${(s.exams as unknown as Record<string, unknown>)?.title ?? 'Exam'}: ${s.percentage?.toFixed(1) ?? 0}%`).join('\n') ?? 'No recent exams'}

For each weak topic, assess severity and recommend specific study actions.
For strong topics, suggest how to maintain or leverage them.
Provide a prioritized study plan focusing on the weakest areas first.

Respond as JSON matching the WeaknessReport structure.`

  const response = await executeStructuredAI<WeaknessReport>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'Progress'),
      userId,
      schoolId,
      metadata: { type: 'weakness_detection', subject: request.subject },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        weakTopics: data.weakTopics ?? [],
        strongTopics: data.strongTopics ?? [],
        overallAssessment: data.overallAssessment ?? '',
        studyPriority: data.studyPriority ?? [],
        estimatedImprovementTime: data.estimatedImprovementTime ?? '2-4 weeks with consistent practice',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Explain-Anything Mode
// ──────────────────────────────────────────────────────────────

export async function explainConcept(
  request: ExplainRequest,
  userId: string,
  schoolId?: string | null
): Promise<ExplainResponse> {
  const prompt = `Explain the following concept in a way a student can truly understand:

Concept: ${request.concept}
Subject: ${request.subject}
${request.studentLevel ? `Student Level: ${request.studentLevel}` : 'Student Level: Secondary school'}
${request.learningStyle ? `Preferred Learning Style: ${request.learningStyle}` : ''}
${request.previousKnowledge?.length ? `What they already know: ${request.previousKnowledge.join(', ')}` : ''}

Provide:
1. A clear, step-by-step explanation
2. A memorable analogy or comparison to everyday life
3. A real-world example that makes it concrete
4. Key points to remember (like a cheat sheet)
5. Common misconceptions students have about this concept
6. What to learn next (prerequisite connections)

Be conversational, encouraging, and use simple language. Avoid jargon unless you explain it.
${request.learningStyle === 'visual' ? 'Use visual descriptions and spatial analogies.' : ''}
${request.learningStyle === 'kinesthetic' ? 'Include hands-on activities or experiments they can try.' : ''}

Respond as JSON matching the ExplainResponse structure.`

  const response = await executeStructuredAI<ExplainResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('student', 'AI Tutor'),
      userId,
      schoolId,
      metadata: { type: 'explain_concept', concept: request.concept },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        explanation: data.explanation ?? '',
        analogy: data.analogy ?? '',
        realWorldExample: data.realWorldExample ?? '',
        keyPoints: data.keyPoints ?? [],
        commonMisconceptions: data.commonMisconceptions ?? [],
        nextSteps: data.nextSteps ?? [],
      }
    }
  )

  return response.parsed
}
