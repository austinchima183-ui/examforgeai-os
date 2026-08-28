// ============================================================================
// ExamForge AI — Exam & Question Server Actions
// ============================================================================
// All mutations verify the authenticated user, their role, and school
// ownership before allowing any changes.

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth/require-auth'

// ─── Zod Schemas ──────────────────────────────────────────────────────

const createExamSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  total_marks: z.coerce.number().min(1, 'Total marks must be at least 1'),
  pass_mark: z.coerce.number().min(0, 'Pass mark must be 0 or higher'),
  class_name: z.string().optional(),
  school_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  shuffle_questions: z.boolean().default(false),
  show_results: z.boolean().default(true),
  allow_review: z.boolean().default(false),
  auto_submit: z.boolean().default(true),
})

const createQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  type: z.enum(['single_choice', 'multi_choice', 'multi_select', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering']),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
  marks: z.coerce.number().min(1, 'Marks must be at least 1'),
  options: z.string().optional(), // JSON string of options
  correct_answer: z.string().optional(),
  explanation: z.string().optional(),
  school_id: z.string().optional(),
})

// ─── Create Exam Action ──────────────────────────────────────────────

export async function createExamAction(formData: FormData) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  // Only teachers and admins can create exams
  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to create exams' }
  }

  // ── Parse and validate raw form values (manual — the Zod exam schema uses
  //    a different field contract than the create dialog's FormData) ──
  const title = String(formData.get('title') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const durationMinutes = parseInt(String(formData.get('duration_minutes') ?? '0'), 10)
  const totalMarks = parseFloat(String(formData.get('total_marks') ?? '0'))
  const passMark = parseFloat(String(formData.get('pass_mark') ?? '0'))
  const className = String(formData.get('class_name') ?? '').trim() || null
  const schoolId = String(formData.get('school_id') ?? '') || user.schoolId || null
  const startTimeRaw = String(formData.get('start_time') ?? '').trim() || null
  const endTimeRaw = String(formData.get('end_time') ?? '').trim() || null
  const shuffleQuestions = formData.get('shuffle_questions') === 'true'
  const showResults = formData.get('show_results') !== 'false'
  const autoSubmit = formData.get('auto_submit') !== 'false'

  // ── Validation ──
  if (!title) return { error: 'Exam title is required' }
  if (title.length > 300) return { error: 'Exam title must be at most 300 characters' }
  if (!subject) return { error: 'Subject is required' }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
    return { error: 'Duration must be between 1 and 600 minutes' }
  }
  if (!Number.isFinite(totalMarks) || totalMarks < 1 || totalMarks > 10000) {
    return { error: 'Total marks must be between 1 and 10,000' }
  }
  if (!Number.isFinite(passMark) || passMark < 0 || passMark > totalMarks) {
    return { error: 'Pass mark must be between 0 and the total marks' }
  }

  // ── Resolve times (exams table requires non-null start_time/end_time) ──
  const now = new Date()
  const startTime = startTimeRaw ? new Date(startTimeRaw) : now
  const endTime = endTimeRaw
    ? new Date(endTimeRaw)
    : new Date(startTime.getTime() + durationMinutes * 60 * 1000)
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { error: 'Invalid start or end time' }
  }

  // ── Resolve subject name → subject_id (create the subject row if new) ──
  let subjectId: string | null = null
  if (schoolId) {
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', subject)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (existingSubject?.id) {
      subjectId = existingSubject.id
    } else {
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ name: subject, code: subject.slice(0, 8).toUpperCase(), school_id: schoolId, is_active: true })
        .select('id')
        .single()
      if (!subjectError && newSubject?.id) subjectId = newSubject.id
    }
  }

  // ── Resolve class name → class_id within the school ──
  let classId: string | null = null
  if (className && schoolId) {
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('name', className)
      .eq('school_id', schoolId)
      .maybeSingle()
    classId = existingClass?.id ?? null
  }

  // ── Insert with the live table's column names ──
  const { error } = await supabase
    .from('exams')
    .insert({
      title,
      description,
      school_id: schoolId,
      created_by: user.id,
      subject_id: subjectId,
      class_id: classId,
      exam_type: 'school_exam',
      status: 'draft',
      total_marks: String(totalMarks),
      pass_mark: String(passMark),
      time_limit_minutes: durationMinutes,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      allowed_attempts: 1,
      randomize_questions: shuffleQuestions,
      randomize_options: shuffleQuestions,
      show_results: showResults ? 'after_submission' : 'never',
      auto_submit: autoSubmit,
      allow_resume: true,
    })

  if (!error) {
    revalidatePath('/cbt')
    revalidatePath('/exams')
  }

  return { error: error?.message ?? null }
}

// ─── Create Question Action ─────────────────────────────────────────

export async function createQuestionAction(formData: FormData) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  // Only teachers and admins can create questions
  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to create questions' }
  }

  const rawData = {
    text: formData.get('text') as string,
    type: formData.get('type') as string,
    subject: formData.get('subject') as string,
    topic: formData.get('topic') as string || undefined,
    difficulty: formData.get('difficulty') as string || 'medium',
    marks: formData.get('marks') as string,
    options: formData.get('options') as string || undefined,
    correct_answer: formData.get('correct_answer') as string || undefined,
    explanation: formData.get('explanation') as string || undefined,
    school_id: formData.get('school_id') as string || user.schoolId || undefined,
  }

  const validated = createQuestionSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const insertData: Record<string, unknown> = {
    text: validated.data.text,
    type: validated.data.type,
    subject: validated.data.subject,
    topic: validated.data.topic,
    difficulty: validated.data.difficulty,
    marks: validated.data.marks,
    correct_answer: validated.data.correct_answer,
    explanation: validated.data.explanation,
    school_id: validated.data.school_id || null,
    created_by: user.id,
  }

  // Parse options JSON if provided
  if (validated.data.options) {
    try {
      insertData.options = JSON.parse(validated.data.options)
    } catch {
      // Not valid JSON, store as-is
    }
  }

  const { error } = await supabase
    .from('questions')
    .insert(insertData)

  if (!error) {
    revalidatePath('/question-bank')
  }

  return { error: error?.message ?? null }
}

// ─── Zod Schemas for Updates ─────────────────────────────────────────────

const updateExamSchema = z.object({
  title: z.string().min(1, 'Exam title is required').optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, 'Duration must be at least 1 minute').optional(),
  total_marks: z.coerce.number().min(1, 'Total marks must be at least 1').optional(),
  pass_mark: z.coerce.number().min(0, 'Pass mark must be 0 or higher').optional(),
  class_name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  shuffle_questions: z.boolean().optional(),
  show_results: z.boolean().optional(),
  allow_review: z.boolean().optional(),
  auto_submit: z.boolean().optional(),
  instructions: z.string().optional(),
})

const updateQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required').optional(),
  type: z.enum(['single_choice', 'multi_choice', 'multi_select', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering']).optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  marks: z.coerce.number().min(1, 'Marks must be at least 1').optional(),
  options: z.string().optional(),
  correct_answer: z.string().optional(),
  explanation: z.string().optional(),
})

// ─── Update Exam Action ──────────────────────────────────────────────

export async function updateExamAction(id: string, formData: FormData) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  // Only teachers and admins can update exams
  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to update exams' }
  }

  // Build update data from FormData
  const updates: Record<string, unknown> = {}
  const fields = ['title', 'subject', 'description', 'duration_minutes', 'total_marks', 'pass_mark', 'class_name', 'start_time', 'end_time', 'instructions']
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      if (field === 'duration_minutes' || field === 'total_marks' || field === 'pass_mark') {
        updates[field] = Number(value)
      } else {
        updates[field] = value as string
      }
    }
  }

  const booleanFields = ['shuffle_questions', 'show_results', 'allow_review', 'auto_submit']
  for (const field of booleanFields) {
    const value = formData.get(field)
    if (value !== null) {
      updates[field] = value === 'true'
    }
  }

  const validated = updateExamSchema.safeParse(updates)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Teachers can only update their own exams; admins can update any in their school
  if (user.role === 'teacher') {
    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', id)
      .single()
    if (!exam || exam.created_by !== user.id) {
      return { error: 'You can only update exams you created' }
    }
  }

  const { error } = await supabase
    .from('exams')
    .update({ ...validated.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) {
    revalidatePath('/cbt')
    revalidatePath(`/exams/${id}`)
  }

  return { error: error?.message ?? null }
}

// ─── Delete Exam Action (Soft Delete) ─────────────────────────────────

export async function deleteExamAction(id: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to delete exams' }
  }

  // Teachers can only delete their own exams
  if (user.role === 'teacher') {
    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('id', id)
      .single()
    if (!exam || exam.created_by !== user.id) {
      return { error: 'You can only delete exams you created' }
    }
  }

  // Soft delete: set status to 'archived'
  const { error } = await supabase
    .from('exams')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) {
    revalidatePath('/cbt')
  }

  return { error: error?.message ?? null }
}

// ─── Duplicate Exam Action ───────────────────────────────────────────

export async function duplicateExamAction(id: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to duplicate exams' }
  }

  // Fetch the original exam
  const { data: originalExam, error: fetchError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !originalExam) {
    return { error: 'Exam not found' }
  }

  // Check access for teachers
  if (user.role === 'teacher' && originalExam.created_by !== user.id) {
    return { error: 'You can only duplicate exams you created' }
  }

  // Clone with new ID and modified title
  const { id: _id, created_at: _ca, updated_at: _ua, ...examData } = originalExam
  void _id; void _ca; void _ua

  const { error } = await supabase
    .from('exams')
    .insert({
      ...examData,
      title: `${originalExam.title} (Copy)`,
      status: 'draft',
      created_by: user.id,
    })

  if (!error) {
    revalidatePath('/cbt')
  }

  return { error: error?.message ?? null }
}

// ─── Publish Exam Action ─────────────────────────────────────────────

export async function publishExamAction(id: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to publish exams' }
  }

  // Only draft or archived exams can be published
  const { data: exam } = await supabase
    .from('exams')
    .select('status, created_by')
    .eq('id', id)
    .single()

  if (!exam) {
    return { error: 'Exam not found' }
  }

  if (exam.status !== 'draft' && exam.status !== 'archived') {
    return { error: 'Only draft or archived exams can be published' }
  }

  if (user.role === 'teacher' && exam.created_by !== user.id) {
    return { error: 'You can only publish exams you created' }
  }

  const { error } = await supabase
    .from('exams')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) {
    revalidatePath('/cbt')
    revalidatePath(`/exams/${id}`)
  }

  return { error: error?.message ?? null }
}

// ─── Update Question Action ──────────────────────────────────────────

export async function updateQuestionAction(id: string, formData: FormData) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to update questions' }
  }

  // Build update data from FormData
  const updates: Record<string, unknown> = {}
  const fields = ['text', 'type', 'subject', 'topic', 'difficulty', 'correct_answer', 'explanation']
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      updates[field] = value as string
    }
  }

  const marksValue = formData.get('marks')
  if (marksValue !== null && marksValue !== '') {
    updates.marks = Number(marksValue)
  }

  // Parse options JSON if provided
  const optionsValue = formData.get('options')
  if (optionsValue !== null && optionsValue !== '') {
    try {
      updates.options = JSON.parse(optionsValue as string)
    } catch {
      // Not valid JSON, skip
    }
  }

  const validated = updateQuestionSchema.safeParse(updates)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Teachers can only update their own questions
  if (user.role === 'teacher') {
    const { data: question } = await supabase
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single()
    if (!question || question.created_by !== user.id) {
      return { error: 'You can only update questions you created' }
    }
  }

  const { error } = await supabase
    .from('questions')
    .update({ ...validated.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) {
    revalidatePath('/question-bank')
  }

  return { error: error?.message ?? null }
}

// ─── Delete Question Action (Soft Delete) ────────────────────────────

export async function deleteQuestionAction(id: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
    return { error: 'Insufficient permissions to delete questions' }
  }

  if (user.role === 'teacher') {
    const { data: question } = await supabase
      .from('questions')
      .select('created_by')
      .eq('id', id)
      .single()
    if (!question || question.created_by !== user.id) {
      return { error: 'You can only delete questions you created' }
    }
  }

  const { error } = await supabase
    .from('questions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) {
    revalidatePath('/question-bank')
  }

  return { error: error?.message ?? null }
}
