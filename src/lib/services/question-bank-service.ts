// ============================================================================
// ExamForge AI — Question Bank Data Service
// ============================================================================
// Server-side data fetching for the question bank.
// All queries use the Supabase server client with cookie-based auth.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import { devDashboardStats } from '@/lib/supabase/dev-adapter'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface QuestionListItem {
  id: string
  text: string
  subject: string | null
  topic: string | null
  type: string
  difficulty: string
  marks: number
  examUsageCount: number
  aiGenerated: boolean
  createdAt: string
}

export interface QuestionBankStats {
  totalQuestions: number
  aiGenerated: number
  subjectsCovered: number
  examUsage: number
}

export interface QuestionBankPageData {
  stats: QuestionBankStats
  questions: QuestionListItem[]
  subjects: string[]
  topics: string[]
}

// ──────────────────────────────────────────────────────────────
// Question Bank Service
// ──────────────────────────────────────────────────────────────

export async function getQuestionBankData(
  role: string,
  userId: string,
  schoolId: string | null
): Promise<QuestionBankPageData> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    return {
      stats: { totalQuestions: 245, aiGenerated: 87, subjectsCovered: 6, examUsage: 120 },
      questions: [],
      subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics'],
      topics: [],
    }
  }

  // Build query — live schema: question_bank is the rich bank table
  // (the `questions` table is per-exam CBT questions only)
  let query = supabase
    .from('question_bank')
    .select(`
      id,
      content,
      question_type,
      difficulty,
      marks,
      subject_id,
      topic_id,
      usage_count,
      is_published,
      created_at,
      created_by,
      school_id
    `)
    .order('created_at', { ascending: false })

  // Scope by role — SECURITY: Every non-super_admin role must be scoped
  if (role === 'school_admin' && schoolId) {
    query = query.eq('school_id', schoolId)
  } else if (role === 'teacher') {
    query = query.eq('created_by', userId)
  } else if (role === 'student' && schoolId) {
    // SECURITY: Students must only see published questions from their own school
    query = query.eq('school_id', schoolId).eq('is_published', true)
  } else if (role === 'student') {
    // Student without schoolId — return nothing (cannot safely scope)
    return { stats: { totalQuestions: 0, aiGenerated: 0, subjectsCovered: 0, examUsage: 0 }, questions: [], subjects: [], topics: [] }
  }

  const { data: questions, error } = await query.limit(200)

  if (error) {
    console.error('Error fetching question bank:', error)
    return { stats: { totalQuestions: 0, aiGenerated: 0, subjectsCovered: 0, examUsage: 0 }, questions: [], subjects: [], topics: [] }
  }

  // AI-generated count from the dedicated pipeline table (scoped by school)
  let aiGeneratedCount = 0
  if (schoolId) {
    const { count } = await supabase
      .from('ai_generated_questions')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
    aiGeneratedCount = count ?? 0
  }

  // Get subjects and topics
  const subjectIds = [...new Set((questions ?? []).map(q => q.subject_id).filter(Boolean))] as string[]
  const topicIds = [...new Set((questions ?? []).map(q => q.topic_id).filter(Boolean))] as string[]

  const [subjectsResult, topicsResult] = await Promise.all([
    supabase.from('subjects').select('id, name').in('id', subjectIds.length > 0 ? subjectIds : ['__none__']),
    supabase.from('topics').select('id, name').in('id', topicIds.length > 0 ? topicIds : ['__none__']),
  ])

  // Build lookup maps
  const subjectMap = new Map<string, string>()
  for (const s of subjectsResult.data ?? []) {
    subjectMap.set(s.id, s.name)
  }

  const topicMap = new Map<string, string>()
  for (const t of topicsResult.data ?? []) {
    topicMap.set(t.id, t.name)
  }

  // Map to list items
  const questionList: QuestionListItem[] = (questions ?? []).map(q => ({
    id: q.id,
    text: q.content ?? '',
    subject: q.subject_id ? (subjectMap.get(q.subject_id) ?? null) : null,
    topic: q.topic_id ? (topicMap.get(q.topic_id) ?? null) : null,
    type: q.question_type ?? 'single_choice',
    difficulty: q.difficulty ?? 'medium',
    marks: q.marks ?? 0,
    examUsageCount: q.usage_count ?? 0,
    aiGenerated: false,
    createdAt: q.created_at,
  }))

  // Calculate stats
  const totalQuestions = questionList.length
  const aiGenerated = aiGeneratedCount
  const uniqueSubjects = new Set(questionList.map(q => q.subject).filter(Boolean))
  const subjectsCovered = uniqueSubjects.size
  const examUsage = questionList.filter(q => q.examUsageCount > 0).length

  return {
    stats: { totalQuestions, aiGenerated, subjectsCovered, examUsage },
    questions: questionList,
    subjects: Array.from(subjectMap.values()).sort(),
    topics: Array.from(topicMap.values()).sort(),
  }
}
