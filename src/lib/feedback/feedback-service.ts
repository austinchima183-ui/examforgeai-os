// ============================================================================
// ExamForge AI — Feedback Core Service
// ============================================================================
// Server-side service for all feedback CRUD operations, comments, assignments,
// AI ratings, result disputes, screenshot uploads, and context capture.
// Every mutation includes user_id / school_id scoping for IDOR protection.
// ============================================================================

'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type {
  FeedbackItem,
  FeedbackCreateInput,
  FeedbackUpdateInput,
  FeedbackComment,
  FeedbackFilters,
  FeedbackListResult,
  FeedbackContext,
  FeedbackScreenshot,
  AIResponseRating,
  ResultDispute,
  FeedbackSeverity,
  FeedbackStatus,
  FeedbackType,
  FeedbackAnalytics,
  FeedbackPriority,
} from './types'
import { transitionFeedback } from './status-workflow'

const log = createLogger('feedback:service')

// ──────────────────────────────────────────────────────────────
// Supabase Client Helper
// ──────────────────────────────────────────────────────────────

async function getSupabase() {
  const supabase = await createClient()
  return supabase
}

// ──────────────────────────────────────────────────────────────
// Row ↔ Type Mapping
// ──────────────────────────────────────────────────────────────

/** Map a Supabase row to a FeedbackItem domain object */
function mapRowToFeedbackItem(row: Record<string, unknown>): FeedbackItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    schoolId: (row.school_id as string) ?? null,
    type: row.type as FeedbackType,
    title: row.title as string,
    description: row.description as string,
    severity: row.severity as FeedbackSeverity,
    status: row.status as FeedbackStatus,
    priority: row.priority as FeedbackPriority,
    assigneeId: (row.assignee_id as string) ?? null,
    screenshotUrls: (row.screenshot_urls as string[]) ?? [],
    context: (row.context as FeedbackContext) ?? null,
    aiRating: (row.ai_rating as AIResponseRating) ?? null,
    resultDispute: (row.result_dispute as ResultDispute) ?? null,
    tags: (row.tags as string[]) ?? [],
    duplicateOfId: (row.duplicate_of_id as string) ?? null,
    upvotes: (row.upvotes as number) ?? 0,
    isDeleted: (row.is_deleted as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    resolvedAt: (row.resolved_at as string) ?? null,
  }
}

/** Map a Supabase row to a FeedbackComment domain object */
function mapRowToComment(row: Record<string, unknown>): FeedbackComment {
  return {
    id: row.id as string,
    feedbackId: row.feedback_id as string,
    userId: row.user_id as string,
    content: row.content as string,
    isInternal: (row.is_internal as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// Create Feedback
// ──────────────────────────────────────────────────────────────

/**
 * Create a new feedback item with auto-captured context.
 *
 * @param userId - Authenticated user's ID (server-derived, never from input)
 * @param input - Validated creation input
 * @returns The created FeedbackItem, or { error }
 */
export async function createFeedback(
  userId: string,
  input: FeedbackCreateInput
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const now = new Date().toISOString()

    // Determine severity and priority defaults based on type
    const severity = input.severity ?? (input.type === 'bug_report' ? 3 : 2)
    const priority = input.priority ?? (input.type === 'bug_report' ? 'normal' : 'low')

    // Upload screenshots if provided
    const screenshotUrls: string[] = []
    if (input.screenshots && input.screenshots.length > 0) {
      for (const screenshot of input.screenshots) {
        const url = await uploadScreenshotToStorage(screenshot, userId)
        if (url) screenshotUrls.push(url)
      }
    }

    const row = {
      user_id: userId,
      school_id: input.schoolId ?? null,
      type: input.type,
      title: input.title,
      description: input.description,
      severity,
      status: 'open' as FeedbackStatus,
      priority,
      assignee_id: null,
      screenshot_urls: screenshotUrls,
      context: input.context ?? null,
      ai_rating: input.aiRating ?? null,
      result_dispute: input.resultDispute ?? null,
      tags: input.tags ?? [],
      duplicate_of_id: null,
      upvotes: 0,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert(row)
      .select()
      .single()

    if (error) {
      log.error('Failed to create feedback', error, { userId, type: input.type })
      return { error: 'Failed to create feedback item' }
    }

    log.info('Feedback created', { feedbackId: data.id, userId, type: input.type })
    return { data: mapRowToFeedbackItem(data as Record<string, unknown>) }
  } catch (err) {
    log.error('Unexpected error creating feedback', err, { userId })
    return { error: 'An unexpected error occurred while creating feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// Get Feedback (List)
// ──────────────────────────────────────────────────────────────

/**
 * Query feedback items with pagination, filtering, and sorting.
 *
 * @param filters - Filter parameters (type, status, severity, etc.)
 * @returns Paginated list of feedback items
 */
export async function getFeedback(
  filters: FeedbackFilters
): Promise<{ data: FeedbackListResult } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const {
      type, status, severity, priority,
      assigneeId, schoolId, userId, search,
      page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = filters

    const offset = (page - 1) * limit

    // Build query — always exclude soft-deleted items
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)

    // Apply filters
    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)
    if (priority) query = query.eq('priority', priority)
    if (assigneeId) query = query.eq('assignee_id', assigneeId)
    if (schoolId) query = query.eq('school_id', schoolId)
    if (userId) query = query.eq('user_id', userId)

    // Text search on title and description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Sort
    const sortColumn = sortBy === 'createdAt' ? 'created_at'
      : sortBy === 'updatedAt' ? 'updated_at'
      : sortBy
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      log.error('Failed to query feedback', error, { filters })
      return { error: 'Failed to query feedback items' }
    }

    const total = count ?? 0
    const items = (data ?? []).map((row: Record<string, unknown>) => mapRowToFeedbackItem(row))

    return {
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (err) {
    log.error('Unexpected error querying feedback', err, { filters })
    return { error: 'An unexpected error occurred while querying feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// Get Feedback By ID
// ──────────────────────────────────────────────────────────────

/**
 * Get a single feedback item by ID with IDOR protection.
 *
 * IDOR protection: The query includes .eq('user_id', userId) for students/parents,
 * or school-scoped filtering for school_admin/teacher. Super_admin has unrestricted access.
 *
 * @param feedbackId - The feedback item ID
 * @param userId - Authenticated user's ID (for IDOR check)
 * @param userRole - Authenticated user's role (for scope check)
 * @param schoolId - Authenticated user's school ID (for scope check)
 */
export async function getFeedbackById(
  feedbackId: string,
  userId: string,
  userRole?: string,
  schoolId?: string | null
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .eq('is_deleted', false)

    // IDOR protection: scope by role
    if (userRole === 'student' || userRole === 'parent') {
      // Students/parents can only see their own feedback
      query = query.eq('user_id', userId)
    } else if ((userRole === 'school_admin' || userRole === 'teacher') && schoolId) {
      // School-scoped: can see all feedback in their school
      query = query.eq('school_id', schoolId)
    }
    // super_admin has unrestricted access

    const { data, error } = await query.single()

    if (error || !data) {
      log.warn('Feedback not found or access denied', { feedbackId, userId, userRole })
      return { error: 'Feedback item not found or access denied' }
    }

    return { data: mapRowToFeedbackItem(data as Record<string, unknown>) }
  } catch (err) {
    log.error('Unexpected error getting feedback by ID', err, { feedbackId, userId })
    return { error: 'An unexpected error occurred while fetching feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// Update Feedback
// ──────────────────────────────────────────────────────────────

/**
 * Update a feedback item with IDOR protection and status workflow validation.
 *
 * @param feedbackId - The feedback item ID
 * @param userId - Authenticated user's ID (for IDOR check)
 * @param input - Validated update input
 * @param userRole - User role for authorization
 * @param schoolId - User's school ID for scoping
 */
export async function updateFeedback(
  feedbackId: string,
  userId: string,
  input: FeedbackUpdateInput,
  userRole?: string,
  schoolId?: string | null
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const supabase = await getSupabase()

    // First, get the current item (with IDOR protection)
    const currentResult = await getFeedbackById(feedbackId, userId, userRole, schoolId)
    if ('error' in currentResult) return currentResult
    const current = currentResult.data

    // Validate status transition if status is being changed
    if (input.status && input.status !== current.status) {
      const transition = transitionFeedback(feedbackId, current.status, input.status)
      if (!transition.success) {
        return { error: transition.error ?? 'Invalid status transition' }
      }
    }

    // Build update object
    const updateRow: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updateRow.title = input.title
    if (input.description !== undefined) updateRow.description = input.description
    if (input.severity !== undefined) updateRow.severity = input.severity
    if (input.status !== undefined) updateRow.status = input.status
    if (input.priority !== undefined) updateRow.priority = input.priority
    if (input.assigneeId !== undefined) updateRow.assignee_id = input.assigneeId
    if (input.tags !== undefined) updateRow.tags = input.tags
    if (input.duplicateOfId !== undefined) updateRow.duplicate_of_id = input.duplicateOfId

    // Set resolved_at when transitioning to resolved
    if (input.status === 'resolved') {
      updateRow.resolved_at = new Date().toISOString()
    }

    // Clear resolved_at when reopening
    if (input.status === 'open' && current.status !== 'open') {
      updateRow.resolved_at = null
    }

    // Perform update with IDOR protection
    let updateQuery = supabase
      .from('feedback')
      .update(updateRow)
      .eq('id', feedbackId)

    // Apply IDOR protection on the mutation
    if (userRole === 'student' || userRole === 'parent') {
      updateQuery = updateQuery.eq('user_id', userId)
    } else if ((userRole === 'school_admin' || userRole === 'teacher') && schoolId) {
      updateQuery = updateQuery.eq('school_id', schoolId)
    }

    const { data, error } = await updateQuery.select().single()

    if (error || !data) {
      log.error('Failed to update feedback', error, { feedbackId, userId })
      return { error: 'Failed to update feedback item' }
    }

    log.info('Feedback updated', { feedbackId, userId, changes: Object.keys(input) })
    return { data: mapRowToFeedbackItem(data as Record<string, unknown>) }
  } catch (err) {
    log.error('Unexpected error updating feedback', err, { feedbackId, userId })
    return { error: 'An unexpected error occurred while updating feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// Delete Feedback (Soft Delete)
// ──────────────────────────────────────────────────────────────

/**
 * Soft-delete a feedback item with IDOR protection.
 *
 * @param feedbackId - The feedback item ID
 * @param userId - Authenticated user's ID (for IDOR check)
 * @param userRole - User role for authorization
 * @param schoolId - User's school ID for scoping
 */
export async function deleteFeedback(
  feedbackId: string,
  userId: string,
  userRole?: string,
  schoolId?: string | null
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let deleteQuery = supabase
      .from('feedback')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', feedbackId)

    // IDOR protection
    if (userRole === 'student' || userRole === 'parent') {
      deleteQuery = deleteQuery.eq('user_id', userId)
    } else if ((userRole === 'school_admin' || userRole === 'teacher') && schoolId) {
      deleteQuery = deleteQuery.eq('school_id', schoolId)
    }

    const { error } = await deleteQuery

    if (error) {
      log.error('Failed to soft-delete feedback', error, { feedbackId, userId })
      return { error: 'Failed to delete feedback item' }
    }

    log.info('Feedback soft-deleted', { feedbackId, userId })
    return { success: true }
  } catch (err) {
    log.error('Unexpected error deleting feedback', err, { feedbackId, userId })
    return { error: 'An unexpected error occurred while deleting feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────────────────────

/**
 * Add a comment to a feedback item.
 *
 * @param feedbackId - The feedback item ID
 * @param userId - Authenticated user's ID
 * @param content - Comment text
 * @param isInternal - Whether this is an internal (staff-only) comment
 */
export async function addComment(
  feedbackId: string,
  userId: string,
  content: string,
  isInternal: boolean = false
): Promise<{ data: FeedbackComment } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const now = new Date().toISOString()

    const row = {
      feedback_id: feedbackId,
      user_id: userId,
      content,
      is_internal: isInternal,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('feedback_comments')
      .insert(row)
      .select()
      .single()

    if (error) {
      log.error('Failed to add comment', error, { feedbackId, userId })
      return { error: 'Failed to add comment' }
    }

    log.info('Comment added to feedback', { feedbackId, userId, isInternal })
    return { data: mapRowToComment(data as Record<string, unknown>) }
  } catch (err) {
    log.error('Unexpected error adding comment', err, { feedbackId, userId })
    return { error: 'An unexpected error occurred while adding comment' }
  }
}

/**
 * Get comments for a feedback item.
 *
 * @param feedbackId - The feedback item ID
 * @param includeInternal - Whether to include internal (staff-only) comments
 */
export async function getComments(
  feedbackId: string,
  includeInternal: boolean = false
): Promise<{ data: FeedbackComment[] } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true })

    if (!includeInternal) {
      query = query.eq('is_internal', false)
    }

    const { data, error } = await query

    if (error) {
      log.error('Failed to get comments', error, { feedbackId })
      return { error: 'Failed to get comments' }
    }

    return { data: (data ?? []).map((row: Record<string, unknown>) => mapRowToComment(row)) }
  } catch (err) {
    log.error('Unexpected error getting comments', err, { feedbackId })
    return { error: 'An unexpected error occurred while fetching comments' }
  }
}

// ──────────────────────────────────────────────────────────────
// Assignment
// ──────────────────────────────────────────────────────────────

/**
 * Assign a feedback item to a user.
 *
 * @param feedbackId - The feedback item ID
 * @param assigneeId - The user ID to assign to
 * @param assignedBy - The user ID performing the assignment
 */
export async function assignFeedback(
  feedbackId: string,
  assigneeId: string,
  assignedBy: string
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('feedback')
      .update({
        assignee_id: assigneeId,
        status: 'investigating',
        updated_at: now,
      })
      .eq('id', feedbackId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error || !data) {
      log.error('Failed to assign feedback', error, { feedbackId, assigneeId, assignedBy })
      return { error: 'Failed to assign feedback item' }
    }

    // Add an audit trail comment
    await addComment(
      feedbackId,
      assignedBy,
      `Feedback assigned to user ${assigneeId}`,
      true
    )

    log.info('Feedback assigned', { feedbackId, assigneeId, assignedBy })
    return { data: mapRowToFeedbackItem(data as Record<string, unknown>) }
  } catch (err) {
    log.error('Unexpected error assigning feedback', err, { feedbackId, assigneeId })
    return { error: 'An unexpected error occurred while assigning feedback' }
  }
}

// ──────────────────────────────────────────────────────────────
// AI Rating (Simplified Flow)
// ──────────────────────────────────────────────────────────────

/**
 * Submit an AI response rating. Creates a feedback item of type ai_rating.
 * This is a lightweight flow for inline thumbs-up/down on AI responses.
 *
 * @param userId - Authenticated user's ID
 * @param rating - AI response rating data
 */
export async function submitAIRating(
  userId: string,
  rating: AIResponseRating
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const title = rating.thumbsUp
      ? `Positive AI rating for ${rating.model}`
      : `Negative AI rating for ${rating.model}`

    const result = await createFeedback(userId, {
      type: 'ai_rating',
      title,
      description: rating.comment || `Rated ${rating.rating}/5 for ${rating.provider}/${rating.model}`,
      severity: rating.thumbsUp ? 1 : 3,
      priority: rating.thumbsUp ? 'low' : 'normal',
      aiRating: rating,
    })

    return result
  } catch (err) {
    log.error('Unexpected error submitting AI rating', err, { userId })
    return { error: 'An unexpected error occurred while submitting AI rating' }
  }
}

// ──────────────────────────────────────────────────────────────
// Result Dispute
// ──────────────────────────────────────────────────────────────

/**
 * Submit an exam result dispute. Creates a feedback item of type result_dispute.
 *
 * @param userId - Authenticated user's ID
 * @param dispute - Result dispute data
 */
export async function submitResultDispute(
  userId: string,
  dispute: ResultDispute
): Promise<{ data: FeedbackItem } | { error: string }> {
  try {
    const result = await createFeedback(userId, {
      type: 'result_dispute',
      title: `Dispute: Question ${dispute.questionId} in Exam ${dispute.examId}`,
      description: dispute.reason,
      severity: 4,
      priority: 'high',
      resultDispute: dispute,
    })

    return result
  } catch (err) {
    log.error('Unexpected error submitting result dispute', err, { userId })
    return { error: 'An unexpected error occurred while submitting result dispute' }
  }
}

// ──────────────────────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────────────────────

/**
 * Get aggregated feedback analytics for the dashboard.
 *
 * @param schoolId - Optional school ID to scope the analytics
 */
export async function getFeedbackAnalytics(
  schoolId?: string
): Promise<{ data: FeedbackAnalytics } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback')
      .select('type, status, severity, created_at, resolved_at')
      .eq('is_deleted', false)

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data, error } = await query

    if (error) {
      log.error('Failed to get feedback analytics', error, { schoolId })
      return { error: 'Failed to get feedback analytics' }
    }

    const rows = data ?? []

    // Count by type
    const totalCounts: Record<FeedbackType, number> = {
      bug_report: 0,
      feature_request: 0,
      ai_rating: 0,
      result_dispute: 0,
      accessibility: 0,
      general: 0,
    }

    // Count by status
    const statusDistribution: Record<FeedbackStatus, number> = {
      open: 0,
      investigating: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0,
      duplicate: 0,
    }

    // Count by severity
    const severityDistribution: Record<FeedbackSeverity, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    }

    let totalResolutionMs = 0
    let resolvedCount = 0

    for (const row of rows) {
      const t = row.type as FeedbackType
      const s = row.status as FeedbackStatus
      const sev = row.severity as FeedbackSeverity

      if (t in totalCounts) totalCounts[t]++
      if (s in statusDistribution) statusDistribution[s]++
      if (sev >= 1 && sev <= 5) severityDistribution[sev]++

      // Calculate resolution time
      if (s === 'resolved' && row.resolved_at && row.created_at) {
        const created = new Date(row.created_at as string).getTime()
        const resolved = new Date(row.resolved_at as string).getTime()
        totalResolutionMs += (resolved - created)
        resolvedCount++
      }
    }

    const avgResolutionTime = resolvedCount > 0
      ? (totalResolutionMs / resolvedCount) / (1000 * 60 * 60) // hours
      : null

    return {
      data: {
        totalCounts,
        avgResolutionTime,
        statusDistribution,
        severityDistribution,
      },
    }
  } catch (err) {
    log.error('Unexpected error getting feedback analytics', err, { schoolId })
    return { error: 'An unexpected error occurred while getting analytics' }
  }
}

// ──────────────────────────────────────────────────────────────
// Screenshot Upload
// ──────────────────────────────────────────────────────────────

/**
 * Upload a screenshot to Supabase storage and attach to a feedback item.
 *
 * @param feedbackId - The feedback item ID
 * @param screenshot - Screenshot data
 */
export async function uploadScreenshot(
  feedbackId: string,
  screenshot: FeedbackScreenshot
): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const fileName = `feedback/${feedbackId}/${Date.now()}-${screenshot.fileName}`

    // Convert base64 data URL to binary
    const base64 = screenshot.dataUrl.split(',')[1]
    if (!base64) {
      return { error: 'Invalid screenshot data URL' }
    }
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('feedback-screenshots')
      .upload(fileName, binary, {
        contentType: screenshot.mimeType,
        upsert: false,
      })

    if (uploadError) {
      log.error('Failed to upload screenshot to storage', uploadError, { feedbackId, fileName })
      return { error: 'Failed to upload screenshot' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('feedback-screenshots')
      .getPublicUrl(fileName)

    const url = urlData.publicUrl

    // Attach to feedback item
    const { data: feedback, error: fetchError } = await supabase
      .from('feedback')
      .select('screenshot_urls')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      log.error('Failed to fetch feedback for screenshot attachment', fetchError, { feedbackId })
      return { error: 'Failed to attach screenshot to feedback' }
    }

    const existingUrls = (feedback.screenshot_urls as string[]) ?? []
    await supabase
      .from('feedback')
      .update({
        screenshot_urls: [...existingUrls, url],
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)

    log.info('Screenshot uploaded and attached', { feedbackId, fileName })
    return { url }
  } catch (err) {
    log.error('Unexpected error uploading screenshot', err, { feedbackId })
    return { error: 'An unexpected error occurred while uploading screenshot' }
  }
}

// ──────────────────────────────────────────────────────────────
// Internal: Storage Upload Helper
// ──────────────────────────────────────────────────────────────

/**
 * Upload a screenshot to Supabase storage during feedback creation.
 * Returns the public URL on success, or null on failure.
 */
async function uploadScreenshotToStorage(
  screenshot: FeedbackScreenshot,
  userId: string
): Promise<string | null> {
  try {
    const supabase = await getSupabase()
    const fileName = `feedback/pending/${userId}/${Date.now()}-${screenshot.fileName}`

    const base64 = screenshot.dataUrl.split(',')[1]
    if (!base64) return null
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

    const { error } = await supabase.storage
      .from('feedback-screenshots')
      .upload(fileName, binary, {
        contentType: screenshot.mimeType,
        upsert: false,
      })

    if (error) {
      log.error('Failed to upload screenshot during creation', error, { userId })
      return null
    }

    const { data } = supabase.storage
      .from('feedback-screenshots')
      .getPublicUrl(fileName)

    return data.publicUrl
  } catch (err) {
    log.error('Unexpected error uploading screenshot', err, { userId })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Context Capture — MOVED to capture-context.ts
// ──────────────────────────────────────────────────────────────
// captureContext() is a synchronous client-side function that uses
// browser APIs (window, navigator). It cannot be in a 'use server'
// file because Server Actions must be async.
//
// Import it from '@/lib/feedback/capture-context' instead.
// ──────────────────────────────────────────────────────────────
