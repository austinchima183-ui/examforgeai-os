// ============================================================================
// ExamForge AI — Marketplace V2 Review Service
// ============================================================================
// Full review system: create, update, delete, paginated listing,
// seller responses, helpful votes, reporting, and rating statistics.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  ProductReview,
  SellerReviewResponse,
  ReviewStats,
  ServiceResult,
  PaginatedResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Map DB row to ProductReview
// ──────────────────────────────────────────────────────────────

function mapRowToReview(row: Record<string, unknown>): ProductReview {
  const response = row.seller_response as Record<string, unknown> | null
  let sellerResponse: SellerReviewResponse | null = null

  if (response && typeof response === 'object' && response.body) {
    sellerResponse = {
      body: response.body as string,
      respondedAt: (response.responded_at as string) ?? '',
    }
  }

  return {
    id: row.id as string,
    productId: row.product_id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string) ?? 'Anonymous',
    userAvatarUrl: (row.user_avatar_url as string) ?? null,
    rating: row.rating as 1 | 2 | 3 | 4 | 5,
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? '',
    helpful: (row.helpful as number) ?? 0,
    verified: (row.verified as boolean) ?? false,
    response: sellerResponse,
    reported: (row.reported as boolean) ?? false,
    reportReason: (row.report_reason as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? row.created_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// Create Review Input
// ──────────────────────────────────────────────────────────────

export interface CreateReviewInput {
  productId: string
  userId: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
}

export interface UpdateReviewInput {
  rating?: 1 | 2 | 3 | 4 | 5
  title?: string
  body?: string
}

export interface ReviewFilters {
  rating?: number
  verified?: boolean
  sortBy?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful'
  page?: number
  pageSize?: number
}

// ──────────────────────────────────────────────────────────────
// createReview
// ──────────────────────────────────────────────────────────────

export async function createReview(input: CreateReviewInput): Promise<ServiceResult<ProductReview>> {
  const supabase = await createClient()

  // Verify the user has purchased this product
  const { data: purchase } = await supabase
    .from('marketplace_purchases_v2')
    .select('id')
    .eq('buyer_id', input.userId)
    .eq('product_id', input.productId)
    .eq('status', 'completed')
    .maybeSingle()

  const verified = !!purchase

  // Check for existing review by this user on this product
  const { data: existing } = await supabase
    .from('marketplace_reviews_v2')
    .select('id')
    .eq('user_id', input.userId)
    .eq('product_id', input.productId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'You have already reviewed this product' }
  }

  // Get user profile for name/avatar
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', input.userId)
    .single()

  // Create review
  const { data, error } = await supabase
    .from('marketplace_reviews_v2')
    .insert({
      product_id: input.productId,
      user_id: input.userId,
      user_name: profile?.full_name ?? 'Anonymous',
      user_avatar_url: profile?.avatar_url ?? null,
      rating: input.rating,
      title: input.title,
      body: input.body,
      helpful: 0,
      verified,
      seller_response: null,
      reported: false,
      report_reason: null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[review-service] createReview error:', error)
    return { success: false, error: 'Failed to create review' }
  }

  // Recalculate product rating
  await recalculateProductRating(input.productId)

  return { success: true, data: mapRowToReview(data) }
}

// ──────────────────────────────────────────────────────────────
// updateReview
// ──────────────────────────────────────────────────────────────

export async function updateReview(
  id: string,
  updates: UpdateReviewInput
): Promise<ServiceResult<ProductReview>> {
  const supabase = await createClient()

  const row: Record<string, unknown> = {}
  if (updates.rating !== undefined) row.rating = updates.rating
  if (updates.title !== undefined) row.title = updates.title
  if (updates.body !== undefined) row.body = updates.body

  const { data, error } = await supabase
    .from('marketplace_reviews_v2')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[review-service] updateReview error:', error)
    return { success: false, error: 'Failed to update review' }
  }

  // Recalculate product rating if rating changed
  if (updates.rating !== undefined) {
    await recalculateProductRating(data.product_id as string)
  }

  return { success: true, data: mapRowToReview(data) }
}

// ──────────────────────────────────────────────────────────────
// deleteReview
// ──────────────────────────────────────────────────────────────

export async function deleteReview(id: string): Promise<ServiceResult<boolean>> {
  const supabase = await createClient()

  // Get product ID before deletion for rating recalculation
  const { data: review } = await supabase
    .from('marketplace_reviews_v2')
    .select('product_id')
    .eq('id', id)
    .single()

  if (!review) {
    return { success: false, error: 'Review not found' }
  }

  const { error } = await supabase
    .from('marketplace_reviews_v2')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[review-service] deleteReview error:', error)
    return { success: false, error: 'Failed to delete review' }
  }

  // Recalculate product rating
  await recalculateProductRating(review.product_id as string)

  return { success: true, data: true }
}

// ──────────────────────────────────────────────────────────────
// getProductReviews (paginated, sorted, filtered)
// ──────────────────────────────────────────────────────────────

export async function getProductReviews(
  productId: string,
  filters: ReviewFilters = {}
): Promise<PaginatedResult<ProductReview>> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let qb = supabase
    .from('marketplace_reviews_v2')
    .select('*', { count: 'exact' })
    .eq('product_id', productId)
    .eq('reported', false)

  if (filters.rating !== undefined) {
    qb = qb.eq('rating', filters.rating)
  }

  if (filters.verified !== undefined) {
    qb = qb.eq('verified', filters.verified)
  }

  const sortBy = filters.sortBy ?? 'newest'
  switch (sortBy) {
    case 'newest':
      qb = qb.order('created_at', { ascending: false })
      break
    case 'oldest':
      qb = qb.order('created_at', { ascending: true })
      break
    case 'highest_rated':
      qb = qb.order('rating', { ascending: false })
      break
    case 'lowest_rated':
      qb = qb.order('rating', { ascending: true })
      break
    case 'most_helpful':
      qb = qb.order('helpful', { ascending: false })
      break
  }

  qb = qb.range(from, to)

  const { data, count, error } = await qb

  if (error) {
    console.error('[review-service] getProductReviews error:', error)
    return { items: [], total: 0, page, pageSize, totalPages: 0 }
  }

  const total = count ?? 0
  return {
    items: (data ?? []).map(mapRowToReview),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ──────────────────────────────────────────────────────────────
// respondToReview
// ──────────────────────────────────────────────────────────────

export async function respondToReview(
  reviewId: string,
  response: string
): Promise<ServiceResult<ProductReview>> {
  const supabase = await createClient()

  const sellerResponse: SellerReviewResponse = {
    body: response,
    respondedAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('marketplace_reviews_v2')
    .update({ seller_response: sellerResponse as unknown as Record<string, unknown> })
    .eq('id', reviewId)
    .select('*')
    .single()

  if (error) {
    console.error('[review-service] respondToReview error:', error)
    return { success: false, error: 'Failed to submit response' }
  }

  return { success: true, data: mapRowToReview(data) }
}

// ──────────────────────────────────────────────────────────────
// markReviewHelpful
// ──────────────────────────────────────────────────────────────

export async function markReviewHelpful(reviewId: string): Promise<ServiceResult<number>> {
  const supabase = await createClient()

  // Get current helpful count
  const { data: review } = await supabase
    .from('marketplace_reviews_v2')
    .select('helpful')
    .eq('id', reviewId)
    .single()

  if (!review) {
    return { success: false, error: 'Review not found' }
  }

  const newCount = ((review.helpful as number) ?? 0) + 1

  const { error } = await supabase
    .from('marketplace_reviews_v2')
    .update({ helpful: newCount })
    .eq('id', reviewId)

  if (error) {
    console.error('[review-service] markReviewHelpful error:', error)
    return { success: false, error: 'Failed to mark review as helpful' }
  }

  return { success: true, data: newCount }
}

// ──────────────────────────────────────────────────────────────
// reportReview
// ──────────────────────────────────────────────────────────────

export async function reportReview(
  reviewId: string,
  reason: string
): Promise<ServiceResult<boolean>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('marketplace_reviews_v2')
    .update({
      reported: true,
      report_reason: reason,
    })
    .eq('id', reviewId)

  if (error) {
    console.error('[review-service] reportReview error:', error)
    return { success: false, error: 'Failed to report review' }
  }

  return { success: true, data: true }
}

// ──────────────────────────────────────────────────────────────
// getReviewStats
// ──────────────────────────────────────────────────────────────

export async function getReviewStats(productId: string): Promise<ServiceResult<ReviewStats>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_reviews_v2')
    .select('rating')
    .eq('product_id', productId)
    .eq('reported', false)

  if (error) {
    console.error('[review-service] getReviewStats error:', error)
    return { success: false, error: 'Failed to get review stats' }
  }

  const reviews = data ?? []
  const totalReviews = reviews.length

  if (totalReviews === 0) {
    return {
      success: true,
      data: {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    }
  }

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalRating = 0

  for (const r of reviews) {
    const rating = r.rating as number
    totalRating += rating
    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5]++
    }
  }

  const averageRating = Math.round((totalRating / totalReviews) * 10) / 10

  return {
    success: true,
    data: {
      averageRating,
      totalReviews,
      distribution,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Internal: Recalculate product rating after review changes
// ──────────────────────────────────────────────────────────────

async function recalculateProductRating(productId: string): Promise<void> {
  const supabase = await createClient()

  const { data: reviews } = await supabase
    .from('marketplace_reviews_v2')
    .select('rating')
    .eq('product_id', productId)
    .eq('reported', false)

  if (!reviews || reviews.length === 0) {
    await supabase
      .from('marketplace_listings')
      .update({ rating: 0, review_count: 0 })
      .eq('id', productId)
    return
  }

  const avgRating = reviews.reduce((sum, r) => sum + (r.rating as number), 0) / reviews.length

  await supabase
    .from('marketplace_listings')
    .update({
      rating: Math.round(avgRating * 10) / 10,
      review_count: reviews.length,
    })
    .eq('id', productId)
}
