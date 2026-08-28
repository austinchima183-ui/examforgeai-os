// ============================================================================
// ExamForge AI — Global Search Service
// ============================================================================
// Unified search across all entities in the ExamForge AI platform.
// All queries are scoped by role and school_id to prevent data leakage.
// ============================================================================

import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: string
  href: string
  icon: string
}

export interface SearchResults {
  results: SearchResult[]
  total: number
  query: string
}

// ──────────────────────────────────────────────────────────────
// Search Service
// ──────────────────────────────────────────────────────────────

export async function globalSearch(
  query: string,
  userId: string,
  schoolId: string | null,
  role: string
): Promise<SearchResults> {
  if (!query || query.trim().length < 2) {
    return { results: [], total: 0, query }
  }

  // Sanitize query: trim and limit length
  const sanitizedQuery = query.trim().slice(0, 100)
  const searchTerm = `%${sanitizedQuery}%`
  const results: SearchResult[] = []

  const supabase = await requireSupabase()

  // Dev adapter fallback when Supabase is not configured}

  // Search schools (only for super_admin and school_admin)
  if (role === 'super_admin' || role === 'school_admin') {
    let schoolQuery = supabase
      .from('schools')
      .select('id, name')
      .ilike('name', searchTerm)
      .limit(5)

    // School admin can only search their own school
    if (role === 'school_admin' && schoolId) {
      schoolQuery = schoolQuery.eq('id', schoolId)
    }

    const { data } = await schoolQuery
    for (const item of data ?? []) {
      results.push({
        id: item.id,
        title: item.name,
        subtitle: 'School',
        type: 'school',
        href: '/schools',
        icon: 'School',
      })
    }
  }

  // Search students (ALWAYS scoped by school for non-super_admin)
  // SECURITY: Never run unscoped queries — prevents cross-tenant data leak
  if (role !== 'student') {
    let studentQuery = supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'student')
      .ilike('full_name', searchTerm)
      .limit(5)

    // Always apply school_id scoping unless super_admin with explicit cross-tenant access
    if (schoolId && role !== 'super_admin') {
      studentQuery = studentQuery.eq('school_id', schoolId) // FIX: reassign immutable builder
    }
    // If non-super_admin with null schoolId, skip — cannot safely scope
    if (role === 'super_admin' || (schoolId && role !== 'super_admin')) {
      const { data: students } = await studentQuery
      for (const item of students ?? []) {
        results.push({
          id: item.id,
          title: item.full_name ?? item.email,
          subtitle: item.email,
          type: 'student',
          href: '/students',
          icon: 'GraduationCap',
        })
      }
    }
  }

  // Search teachers (ALWAYS scoped by school for non-super_admin)
  // SECURITY: Never run unscoped queries — prevents cross-tenant data leak
  if (role !== 'student' && role !== 'parent') {
    let teacherQuery = supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'teacher')
      .ilike('full_name', searchTerm)
      .limit(5)

    if (schoolId && role !== 'super_admin') {
      teacherQuery = teacherQuery.eq('school_id', schoolId) // FIX: reassign immutable builder
    }
    // If non-super_admin with null schoolId, skip — cannot safely scope
    if (role === 'super_admin' || (schoolId && role !== 'super_admin')) {
      const { data: teachers } = await teacherQuery
      for (const item of teachers ?? []) {
        results.push({
          id: item.id,
          title: item.full_name ?? item.email,
          subtitle: item.email,
          type: 'teacher',
          href: '/teachers',
          icon: 'BookOpen',
        })
      }
    }
  }

  // Search parents (scoped by school, only for super_admin and school_admin)
  if (role === 'super_admin' || role === 'school_admin') {
    let parentQuery = supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'parent')
      .ilike('full_name', searchTerm)
      .limit(5)
    if (schoolId && role !== 'super_admin') {
      parentQuery = parentQuery.eq('school_id', schoolId) // FIX: reassign immutable builder
    }
    const { data: parents } = await parentQuery
    for (const item of parents ?? []) {
      results.push({
        id: item.id,
        title: item.full_name ?? item.email,
        subtitle: item.email,
        type: 'parent',
        href: '/parents',
        icon: 'Users',
      })
    }
  }

  // Search questions (scoped by school)
  let questionQuery = supabase
    .from('questions')
    .select('id, question_text, question_type')
    .ilike('question_text', searchTerm)
    .limit(5)
  if (schoolId && role !== 'super_admin') {
    questionQuery = questionQuery.eq('school_id', schoolId) // FIX: reassign immutable builder
  }
  if (role === 'teacher') {
    // Teachers only see their own questions
    questionQuery = questionQuery.eq('created_by', userId) // FIX: reassign immutable builder
  }
  const { data: questions } = await questionQuery
  for (const item of questions ?? []) {
    results.push({
      id: item.id,
      title: item.question_text?.slice(0, 80) ?? 'Question',
      subtitle: item.question_type ?? 'Question',
      type: 'question',
      href: '/question-bank',
      icon: 'HelpCircle',
    })
  }

  // Search exams (scoped by school)
  let examQuery = supabase
    .from('exams')
    .select('id, title, subject')
    .ilike('title', searchTerm)
    .limit(5)
  if (schoolId && role !== 'super_admin') {
    examQuery = examQuery.eq('school_id', schoolId) // FIX: reassign immutable builder
  }
  if (role === 'teacher') {
    examQuery = examQuery.eq('created_by', userId) // FIX: reassign immutable builder
  }
  if (role === 'student') {
    examQuery = examQuery.in('status', ['published', 'active', 'completed']) // FIX: reassign immutable builder
  }
  const { data: exams } = await examQuery
  for (const item of exams ?? []) {
    results.push({
      id: item.id,
      title: item.title,
      subtitle: item.subject ?? 'Exam',
      type: 'exam',
      href: '/cbt',
      icon: 'FileText',
    })
  }

  // Search marketplace (public, no school scoping)
  if (role !== 'student') {
    const { data: marketplaceItems } = await supabase
      .from('marketplace_products')
      .select('id, title, category')
      .eq('status', 'published')
      .ilike('title', searchTerm)
      .limit(5)
    for (const item of marketplaceItems ?? []) {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.category ?? 'Marketplace',
        type: 'marketplace',
        href: '/marketplace',
        icon: 'Store',
      })
    }
  }

  // Search notifications (only user's own)
  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, title, type')
    .eq('user_id', userId)
    .ilike('title', searchTerm)
    .limit(5)
  for (const item of notifs ?? []) {
    results.push({
      id: item.id,
      title: item.title,
      subtitle: item.type ?? 'Notification',
      type: 'notification',
      href: '/notifications',
      icon: 'Bell',
    })
  }

  return {
    results: results.slice(0, 20),
    total: results.length,
    query,
  }
}
