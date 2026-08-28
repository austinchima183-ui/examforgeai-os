// ============================================================================
// ExamForge AI Parent — Intelligent Parent Advisor
// ============================================================================
// Production-ready AI-powered workflows for parents:
// - Child progress advisor
// - Weekly summaries
// - Home learning recommendations
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeAI, executeStructuredAI, getSystemPrompt } from './ai-engine'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ChildProgressRequest {
  parentId: string
  childId: string
  childName: string
  period?: 'week' | 'month' | 'term'
}

export interface ChildProgressResponse {
  summary: string
  academicPerformance: Array<{
    subject: string
    averageScore: number
    trend: 'improving' | 'stable' | 'declining'
    grade: string
  }>
  attendanceSummary: {
    rate: number
    absencesThisPeriod: number
    trend: 'improving' | 'stable' | 'declining'
  }
  strengths: string[]
  concerns: string[]
  recommendations: string[]
  upcomingEvents: string[]
  teacherComments: string[]
}

export interface WeeklySummaryRequest {
  parentId: string
  childId: string
  childName: string
}

export interface WeeklySummaryResponse {
  greeting: string
  highlights: string[]
  academicUpdates: Array<{ subject: string; update: string }>
  attendanceNote: string
  upcomingThisWeek: string[]
  homeActivities: string[]
  encouragementNote: string
}

export interface HomeLearningRequest {
  childId: string
  childName: string
  subjects: string[]
  weakAreas: string[]
  availableTime: string
  resources?: string[] // what's available at home
  gradeLevel?: string
}

export interface HomeLearningResponse {
  dailyActivities: Array<{
    day: string
    activities: Array<{
      subject: string
      activity: string
      duration: string
      materials: string
      howTo: string
    }>
  }>
  freeResources: Array<{ name: string; type: string; url: string; description: string }>
  conversationStarters: string[] // things to ask/tell the child
  monitoringTips: string[]
}

// ──────────────────────────────────────────────────────────────
// Child Progress Advisor
// ──────────────────────────────────────────────────────────────

export async function getChildProgressAnalysis(
  request: ChildProgressRequest,
  userId: string,
  schoolId?: string | null
): Promise<ChildProgressResponse> {
  const supabase = await createClient()
  const periodDays = request.period === 'week' ? 7 : request.period === 'month' ? 30 : 90
  const since = new Date(Date.now() - periodDays * 86400000).toISOString()

  // Fetch real data
  const [sessionsResult, attendanceResult, examsResult] = await Promise.all([
    supabase
      .from('exam_sessions')
      .select('id, percentage, total_score, max_score, created_at, exam_id, exams(title, subject_id, subjects(name))')
      .eq('student_id', request.childId)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, status, date, class_id')
      .eq('student_id', request.childId)
      .gte('date', since)
      .order('date', { ascending: false }),
    supabase
      .from('exams')
      .select('id, title, start_time, subjects(name)')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(5),
  ])

  const sessions = sessionsResult.data ?? []
  const attendance = attendanceResult.data ?? []
  const upcomingExams = examsResult.data ?? []

  const attendanceRate = attendance.length > 0
    ? attendance.filter((a) => a.status === 'present').length / attendance.length
    : 1

  const prompt = `Analyze this child's academic progress for the parent:

Child: ${request.childName}
Period: Last ${periodDays} days

Exam Results:
${sessions.length > 0
    ? sessions.map((s) => {
        const exam = s.exams as unknown as Record<string, unknown>
        const subject = exam?.subjects as unknown as Record<string, unknown>
        return `- ${exam?.title ?? 'Exam'} (${subject?.name ?? 'Unknown'}): ${s.percentage?.toFixed(1) ?? 0}%`
      }).join('\n')
    : 'No exam results in this period'}

Attendance: ${(attendanceRate * 100).toFixed(1)}% (${attendance.filter(a => a.status === 'present').length} present, ${attendance.filter(a => a.status === 'absent').length} absent of ${attendance.length} days)

Upcoming Exams:
${upcomingExams.map((e) => {
    const subject = e.subjects as unknown as Record<string, unknown>
    return `- ${e.title} (${subject?.name ?? 'Unknown'}) on ${e.start_time}`
  }).join('\n') || 'None scheduled'}

Provide a parent-friendly analysis:
1. Simple summary (avoid jargon)
2. Performance by subject with trends
3. Attendance analysis
4. Strengths to celebrate
5. Concerns to address
6. Specific recommendations for the parent
7. Upcoming events to be aware of

Be supportive but honest. Parents need to know the real picture but also feel empowered to help.

Respond as JSON matching the ChildProgressResponse structure.`

  const response = await executeStructuredAI<ChildProgressResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('parent', 'Child Progress'),
      userId,
      schoolId,
      metadata: { type: 'child_progress', childId: request.childId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        summary: data.summary ?? '',
        academicPerformance: data.academicPerformance ?? [],
        attendanceSummary: data.attendanceSummary ?? { rate: attendanceRate, absencesThisPeriod: attendance.filter(a => a.status === 'absent').length, trend: 'stable' },
        strengths: data.strengths ?? [],
        concerns: data.concerns ?? [],
        recommendations: data.recommendations ?? [],
        upcomingEvents: data.upcomingEvents ?? [],
        teacherComments: data.teacherComments ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Weekly Summary
// ──────────────────────────────────────────────────────────────

export async function generateWeeklySummary(
  request: WeeklySummaryRequest,
  userId: string,
  schoolId?: string | null
): Promise<WeeklySummaryResponse> {
  const supabase = await createClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [sessionsResult, attendanceResult, eventsResult] = await Promise.all([
    supabase
      .from('exam_sessions')
      .select('id, percentage, created_at, exams(title, subjects(name))')
      .eq('student_id', request.childId)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, status, date')
      .eq('student_id', request.childId)
      .gte('date', oneWeekAgo),
    supabase
      .from('school_calendar_events')
      .select('id, title, start_date, event_type')
      .gte('start_date', new Date().toISOString())
      .lte('start_date', new Date(Date.now() + 7 * 86400000).toISOString())
      .order('start_date', { ascending: true }),
  ])

  const sessions = sessionsResult.data ?? []
  const attendance = attendanceResult.data ?? []
  const events = eventsResult.data ?? []

  const prompt = `Generate a warm, informative weekly summary for a parent about their child:

Child: ${request.childName}

This Week's Exam Results:
${sessions.length > 0
    ? sessions.map((s) => {
        const exam = s.exams as unknown as Record<string, unknown>
        const subject = exam?.subjects as unknown as Record<string, unknown>
        return `- ${exam?.title ?? 'Exam'} (${subject?.name ?? ''}): ${s.percentage?.toFixed(0) ?? 0}%`
      }).join('\n')
    : 'No exams this week'}

This Week's Attendance:
${attendance.length > 0
    ? `${attendance.filter(a => a.status === 'present').length} days present, ${attendance.filter(a => a.status === 'absent').length} absent, ${attendance.filter(a => a.status === 'late').length} late`
    : 'No attendance data this week'}

Upcoming Events at School:
${events.map((e) => `- ${e.title} on ${e.start_date}`).join('\n') || 'No events this week'}

Create a warm, encouraging weekly update that:
1. Starts with a personalized greeting
2. Highlights achievements and progress
3. Gives subject-by-subject updates
4. Notes attendance
5. Lists upcoming events/assignments
6. Suggests home activities to support learning
7. Ends with encouragement

Keep it parent-friendly—no educational jargon.

Respond as JSON matching the WeeklySummaryResponse structure.`

  const response = await executeStructuredAI<WeeklySummaryResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('parent', 'Weekly Summary'),
      userId,
      schoolId,
      metadata: { type: 'weekly_summary', childId: request.childId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        greeting: data.greeting ?? `Hi! Here's how ${request.childName} did this week:`,
        highlights: data.highlights ?? [],
        academicUpdates: data.academicUpdates ?? [],
        attendanceNote: data.attendanceNote ?? '',
        upcomingThisWeek: data.upcomingThisWeek ?? [],
        homeActivities: data.homeActivities ?? [],
        encouragementNote: data.encouragementNote ?? '',
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Home Learning Recommendations
// ──────────────────────────────────────────────────────────────

export async function getHomeLearningRecommendations(
  request: HomeLearningRequest,
  userId: string,
  schoolId?: string | null
): Promise<HomeLearningResponse> {
  const prompt = `Recommend home learning activities for a parent to do with their child:

Child: ${request.childName}
Grade Level: ${request.gradeLevel ?? 'Secondary school'}
Subjects: ${request.subjects.join(', ')}
Weak Areas: ${request.weakAreas.join(', ') || 'None identified'}
Available Time: ${request.availableTime}
${request.resources?.length ? `Available Resources at Home: ${request.resources.join(', ')}` : 'Basic home resources'}

Provide:
1. A daily activity plan (5 days) with specific activities
2. Free resources (websites, apps, YouTube channels, etc.)
3. Conversation starters to engage the child about learning
4. Tips for monitoring progress without being overbearing

Focus on activities that:
- Require minimal preparation and materials
- Are engaging and not just worksheets
- Address weak areas while building confidence
- Can be done in short sessions (15-30 minutes)
- Involve parent-child interaction

Respond as JSON matching the HomeLearningResponse structure.`

  const response = await executeStructuredAI<HomeLearningResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('parent', 'Home Learning'),
      userId,
      schoolId,
      metadata: { type: 'home_learning', childId: request.childId },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        dailyActivities: data.dailyActivities ?? [],
        freeResources: data.freeResources ?? [],
        conversationStarters: data.conversationStarters ?? [],
        monitoringTips: data.monitoringTips ?? [],
      }
    }
  )

  return response.parsed
}
