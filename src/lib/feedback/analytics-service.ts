// ============================================================================
// ExamForge AI — Feedback Analytics Service
// ============================================================================
// Aggregated analytics for the feedback dashboard: overview stats, trends,
// category distributions, resolution metrics, top reporters, and AI quality.
// ============================================================================

'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { FeedbackType, FeedbackStatus } from './types'

const log = createLogger('feedback:analytics')

// ──────────────────────────────────────────────────────────────
// Types for Analytics Results
// ──────────────────────────────────────────────────────────────

export interface FeedbackOverview {
  total: number
  open: number
  resolved: number
  avgResolutionHours: number | null
  pendingGrowth: number // percentage change vs previous period
}

export interface FeedbackTrendPoint {
  date: string
  created: number
  resolved: number
}

export interface FeedbackCategoryBreakdown {
  type: FeedbackType
  count: number
  percentage: number
}

export interface ResolutionMetrics {
  avgResolutionHours: number | null
  medianResolutionHours: number | null
  avgFirstResponseHours: number | null
  resolutionRate: number // percentage
}

export interface TopReporter {
  userId: string
  fullName: string
  count: number
}

export interface AIRatingSummary {
  totalRatings: number
  positiveRate: number // percentage of thumbsUp
  avgRating: number
  byModel: Record<string, { count: number; avgRating: number; positiveRate: number }>
}

// ──────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────

async function getSupabase() {
  return await createClient()
}

// ──────────────────────────────────────────────────────────────
// Overview Stats
// ──────────────────────────────────────────────────────────────

/**
 * Get summary statistics for the feedback dashboard.
 *
 * @param schoolId - Optional school ID to scope results
 * @param dateRange - Optional { from, to } ISO date strings
 */
export async function getFeedbackOverview(
  schoolId?: string,
  dateRange?: { from?: string; to?: string }
): Promise<{ data: FeedbackOverview } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback')
      .select('status, created_at, resolved_at')
      .eq('is_deleted', false)

    if (schoolId) query = query.eq('school_id', schoolId)
    if (dateRange?.from) query = query.gte('created_at', dateRange.from)
    if (dateRange?.to) query = query.lte('created_at', dateRange.to)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get feedback overview', error, { schoolId })
      return { error: 'Failed to get feedback overview' }
    }

    const rows = data ?? []
    let openCount = 0
    let resolvedCount = 0
    let totalResolutionMs = 0

    for (const row of rows) {
      const status = row.status as FeedbackStatus
      if (status === 'open' || status === 'investigating' || status === 'in_progress') {
        openCount++
      }
      if (status === 'resolved') {
        resolvedCount++
        if (row.resolved_at && row.created_at) {
          totalResolutionMs += new Date(row.resolved_at as string).getTime() - new Date(row.created_at as string).getTime()
        }
      }
    }

    const avgResolutionHours = resolvedCount > 0
      ? (totalResolutionMs / resolvedCount) / (1000 * 60 * 60)
      : null

    // Calculate growth: compare current period to previous period
    // Simplified: we compute from the data we have
    let pendingGrowth = 0
    if (dateRange?.from && rows.length > 0) {
      const fromDate = new Date(dateRange.from)
      const periodDays = dateRange.to
        ? (new Date(dateRange.to).getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
        : 30
      const prevFrom = new Date(fromDate.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString()

      let prevQuery = supabase
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .lt('created_at', dateRange.from)
        .gte('created_at', prevFrom)

      if (schoolId) prevQuery = prevQuery.eq('school_id', schoolId)

      const { count: prevCount } = await prevQuery
      const prev = prevCount ?? 0
      if (prev > 0) {
        pendingGrowth = ((rows.length - prev) / prev) * 100
      }
    }

    return {
      data: {
        total: rows.length,
        open: openCount,
        resolved: resolvedCount,
        avgResolutionHours,
        pendingGrowth: Math.round(pendingGrowth * 10) / 10,
      },
    }
  } catch (err) {
    log.error('Unexpected error getting feedback overview', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}

// ──────────────────────────────────────────────────────────────
// Trends Over Time
// ──────────────────────────────────────────────────────────────

/**
 * Get daily trend of created and resolved feedback over the last N days.
 *
 * @param schoolId - Optional school ID to scope results
 * @param days - Number of days to look back (default: 30)
 */
export async function getFeedbackTrends(
  schoolId?: string,
  days: number = 30
): Promise<{ data: FeedbackTrendPoint[] } | { error: string }> {
  try {
    const supabase = await getSupabase()
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    let query = supabase
      .from('feedback')
      .select('created_at, resolved_at, status')
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())

    if (schoolId) query = query.eq('school_id', schoolId)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get feedback trends', error, { schoolId })
      return { error: 'Failed to get feedback trends' }
    }

    // Build daily buckets
    const buckets: Map<string, { created: number; resolved: number }> = new Map()
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      buckets.set(key, { created: 0, resolved: 0 })
    }

    for (const row of data ?? []) {
      const createdDate = (row.created_at as string).slice(0, 10)
      const bucket = buckets.get(createdDate)
      if (bucket) bucket.created++

      if (row.resolved_at && row.status === 'resolved') {
        const resolvedDate = (row.resolved_at as string).slice(0, 10)
        const rBucket = buckets.get(resolvedDate)
        if (rBucket) rBucket.resolved++
      }
    }

    const trends: FeedbackTrendPoint[] = Array.from(buckets.entries()).map(
      ([date, counts]) => ({ date, ...counts })
    )

    return { data: trends }
  } catch (err) {
    log.error('Unexpected error getting feedback trends', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}

// ──────────────────────────────────────────────────────────────
// Category Distribution
// ──────────────────────────────────────────────────────────────

/**
 * Get distribution of feedback by type/category.
 *
 * @param schoolId - Optional school ID to scope results
 */
export async function getFeedbackByCategory(
  schoolId?: string
): Promise<{ data: FeedbackCategoryBreakdown[] } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback')
      .select('type')
      .eq('is_deleted', false)

    if (schoolId) query = query.eq('school_id', schoolId)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get feedback by category', error, { schoolId })
      return { error: 'Failed to get feedback by category' }
    }

    const counts: Record<string, number> = {}
    let total = 0
    for (const row of data ?? []) {
      const t = row.type as string
      counts[t] = (counts[t] ?? 0) + 1
      total++
    }

    const breakdown: FeedbackCategoryBreakdown[] = Object.entries(counts)
      .map(([type, count]) => ({
        type: type as FeedbackType,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return { data: breakdown }
  } catch (err) {
    log.error('Unexpected error getting feedback by category', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}

// ──────────────────────────────────────────────────────────────
// Resolution Metrics
// ──────────────────────────────────────────────────────────────

/**
 * Get resolution time and first-response metrics.
 *
 * @param schoolId - Optional school ID to scope results
 */
export async function getResolutionMetrics(
  schoolId?: string
): Promise<{ data: ResolutionMetrics } | { error: string }> {
  try {
    const supabase = await getSupabase()

    // Get resolved items with timestamps
    let query = supabase
      .from('feedback')
      .select('created_at, resolved_at, status')
      .eq('is_deleted', false)

    if (schoolId) query = query.eq('school_id', schoolId)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get resolution metrics', error, { schoolId })
      return { error: 'Failed to get resolution metrics' }
    }

    const rows = data ?? []
    const resolutionTimes: number[] = [] // in hours
    let totalItems = 0
    let resolvedItems = 0

    for (const row of rows) {
      totalItems++
      const status = row.status as FeedbackStatus

      if (status === 'resolved' && row.resolved_at && row.created_at) {
        resolvedItems++
        const hours = (new Date(row.resolved_at as string).getTime() - new Date(row.created_at as string).getTime()) / (1000 * 60 * 60)
        resolutionTimes.push(hours)
      }
    }

    // Average
    const avgResolutionHours = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : null

    // Median
    const sorted = [...resolutionTimes].sort((a, b) => a - b)
    const medianResolutionHours = sorted.length > 0
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : null

    // First response time: get the first comment timestamp for each feedback
    // This requires a separate query, simplified here
    const avgFirstResponseHours = null // Would need feedback_comments join

    const resolutionRate = totalItems > 0
      ? Math.round((resolvedItems / totalItems) * 1000) / 10
      : 0

    return {
      data: {
        avgResolutionHours: avgResolutionHours !== null ? Math.round(avgResolutionHours * 10) / 10 : null,
        medianResolutionHours: medianResolutionHours !== null ? Math.round(medianResolutionHours * 10) / 10 : null,
        avgFirstResponseHours,
        resolutionRate,
      },
    }
  } catch (err) {
    log.error('Unexpected error getting resolution metrics', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}

// ──────────────────────────────────────────────────────────────
// Top Reporters
// ──────────────────────────────────────────────────────────────

/**
 * Get the most active feedback reporters.
 *
 * @param schoolId - Optional school ID to scope results
 * @param limit - Maximum number of reporters to return (default: 10)
 */
export async function getTopReporters(
  schoolId?: string,
  limit: number = 10
): Promise<{ data: TopReporter[] } | { error: string }> {
  try {
    const supabase = await getSupabase()

    // Get feedback grouped by user_id
    let query = supabase
      .from('feedback')
      .select('user_id')
      .eq('is_deleted', false)

    if (schoolId) query = query.eq('school_id', schoolId)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get top reporters', error, { schoolId })
      return { error: 'Failed to get top reporters' }
    }

    // Count by user
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      const uid = row.user_id as string
      counts[uid] = (counts[uid] ?? 0) + 1
    }

    // Sort and take top N
    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)

    // Resolve user names (best-effort)
    const reporters: TopReporter[] = []
    for (const [userId, count] of sorted) {
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single()

      reporters.push({
        userId,
        fullName: (profile?.full_name as string) ?? 'Unknown User',
        count,
      })
    }

    return { data: reporters }
  } catch (err) {
    log.error('Unexpected error getting top reporters', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}

// ──────────────────────────────────────────────────────────────
// AI Rating Summary
// ──────────────────────────────────────────────────────────────

/**
 * Get aggregated AI quality metrics from ai_rating feedback.
 *
 * @param schoolId - Optional school ID to scope results
 */
export async function getAIRatingSummary(
  schoolId?: string
): Promise<{ data: AIRatingSummary } | { error: string }> {
  try {
    const supabase = await getSupabase()

    let query = supabase
      .from('feedback')
      .select('ai_rating')
      .eq('type', 'ai_rating')
      .eq('is_deleted', false)

    if (schoolId) query = query.eq('school_id', schoolId)

    const { data, error } = await query

    if (error) {
      log.error('Failed to get AI rating summary', error, { schoolId })
      return { error: 'Failed to get AI rating summary' }
    }

    let totalRatings = 0
    let positiveCount = 0
    let ratingSum = 0
    const byModel: Record<string, { count: number; ratingSum: number; positiveCount: number }> = {}

    for (const row of data ?? []) {
      const aiRating = row.ai_rating as Record<string, unknown> | null
      if (!aiRating) continue

      totalRatings++
      const thumbsUp = aiRating.thumbsUp as boolean
      const rating = aiRating.rating as number
      const model = (aiRating.model as string) ?? 'unknown'

      if (thumbsUp) positiveCount++
      ratingSum += rating

      if (!byModel[model]) {
        byModel[model] = { count: 0, ratingSum: 0, positiveCount: 0 }
      }
      byModel[model].count++
      byModel[model].ratingSum += rating
      if (thumbsUp) byModel[model].positiveCount++
    }

    const result: AIRatingSummary = {
      totalRatings,
      positiveRate: totalRatings > 0 ? Math.round((positiveCount / totalRatings) * 1000) / 10 : 0,
      avgRating: totalRatings > 0 ? Math.round((ratingSum / totalRatings) * 10) / 10 : 0,
      byModel: Object.fromEntries(
        Object.entries(byModel).map(([model, stats]) => [
          model,
          {
            count: stats.count,
            avgRating: Math.round((stats.ratingSum / stats.count) * 10) / 10,
            positiveRate: Math.round((stats.positiveCount / stats.count) * 1000) / 10,
          },
        ])
      ),
    }

    return { data: result }
  } catch (err) {
    log.error('Unexpected error getting AI rating summary', err, { schoolId })
    return { error: 'An unexpected error occurred' }
  }
}
