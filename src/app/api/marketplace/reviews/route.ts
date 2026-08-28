import { NextResponse, type NextRequest } from 'next/server'
import { requireApiAuth, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { reviewCreateSchema } from '@/lib/validators/api-schemas'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Marketplace Reviews API Route
// ============================================================================
// GET /api/marketplace/reviews — Fetch reviews (auth required, userId from session)
// POST /api/marketplace/reviews — Create review (auth required)
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.relaxed)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth required — derive userId from session, not client param
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    const tenant = deriveTenantContext(auth)
    const userId = tenant.userId // Server-derived, never from client

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    if (productId) {
      // Get reviews for a specific product
      const { data: reviews, error } = await supabase
        .from('marketplace_reviews')
        .select('id, buyer_id, product_id, rating, content, seller_response, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
      }

      // Get user info
      const userIds = [...new Set((reviews ?? []).map((r: { buyer_id: string }) => r.buyer_id).filter(Boolean))] as string[]
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : ['__none__'])

      const userMap = new Map<string, { name: string; avatar: string | null }>()
      for (const u of users ?? []) {
        userMap.set(u.id, { name: u.full_name ?? 'Anonymous', avatar: u.avatar_url ?? null })
      }

      const mapped = (reviews ?? []).map((r: { id: string; buyer_id: string; product_id: string; rating: number | null; content: string | null; seller_response: string | null; created_at: string }) => {
        const user = userMap.get(r.buyer_id) ?? { name: 'Anonymous', avatar: null }
        return {
          id: r.id,
          userId: r.buyer_id,
          userName: user.name,
          userAvatar: user.avatar,
          productId: r.product_id,
          rating: r.rating ?? 0,
          text: r.content ?? '',
          sellerResponse: r.seller_response ?? null,
          createdAt: r.created_at,
        }
      })

      return NextResponse.json({ reviews: mapped })
    }

    // When no productId, use server-derived userId to get reviews for the authenticated user
    // Get reviews written by user or reviews on user's products
    const { data: userProducts } = await supabase
      .from('marketplace_products')
      .select('id, title')
      .eq('author_id', userId)

    const productMap = new Map<string, string>()
    for (const p of userProducts ?? []) {
      productMap.set(p.id, p.title)
    }

    // Get reviews on user's products (seller view)
    const productIds = (userProducts ?? []).map((p: { id: string }) => p.id)
    const { data: sellerReviews } = await supabase
      .from('marketplace_reviews')
      .select('id, buyer_id, product_id, rating, content, seller_response, created_at')
      .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
      .order('created_at', { ascending: false })

    // Also get reviews written by user (buyer view)
    const { data: buyerReviews } = await supabase
      .from('marketplace_reviews')
      .select('id, buyer_id, product_id, rating, content, seller_response, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })

    // Merge and deduplicate
    const allReviews = [...(sellerReviews ?? []), ...(buyerReviews ?? [])]
    const uniqueReviews = Array.from(
      new Map(allReviews.map((r: { id: string }) => [r.id, r])).values()
    ) as { id: string; buyer_id: string; product_id: string; rating: number | null; content: string | null; seller_response: string | null; created_at: string }[]

    // Get product titles for buyer reviews
    const buyerProductIds = (buyerReviews ?? []).map((r: { product_id: string }) => r.product_id).filter((id: string) => !productMap.has(id))
    if (buyerProductIds.length > 0) {
      const { data: products } = await supabase
        .from('marketplace_products')
        .select('id, title')
        .in('id', buyerProductIds)
      for (const p of products ?? []) {
        productMap.set(p.id, p.title)
      }
    }

    // Get user info
    const reviewUserIds = [...new Set(uniqueReviews.map((r) => r.buyer_id).filter(Boolean))] as string[]
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', reviewUserIds.length > 0 ? reviewUserIds : ['__none__'])

    const userMap = new Map<string, { name: string; avatar: string | null }>()
    for (const u of users ?? []) {
      userMap.set(u.id, { name: u.full_name ?? 'Anonymous', avatar: u.avatar_url ?? null })
    }

    const mapped = uniqueReviews.map((r) => {
      const user = userMap.get(r.buyer_id) ?? { name: 'Anonymous', avatar: null }
      return {
        id: r.id,
        userId: r.buyer_id,
        userName: user.name,
        userAvatar: user.avatar,
        productId: r.product_id,
        productTitle: productMap.get(r.product_id) ?? 'Unknown Product',
        rating: r.rating ?? 0,
        text: r.content ?? '',
        sellerResponse: r.seller_response ?? null,
        createdAt: r.created_at,
      }
    })

    return NextResponse.json({ reviews: mapped })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketplace/reviews GET' }), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth required
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(reviewCreateSchema, rawBody)
    if ('error' in input) return input.error
    const { productId, rating, comment: text } = input.data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Verify purchase
    const { data: purchase } = await supabase
      .from('marketplace_purchases')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (!purchase) {
      return NextResponse.json({ error: 'You must purchase this product before reviewing' }, { status: 403 })
    }

    // Check existing review
    const { data: existing } = await supabase
      .from('marketplace_reviews')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 })
    }

    const { data: review, error } = await supabase
      .from('marketplace_reviews')
      .insert({
        user_id: auth.user.id,
        product_id: productId,
        rating,
        text,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    // Update product rating
    const { data: allReviews } = await supabase
      .from('marketplace_reviews')
      .select('rating')
      .eq('product_id', productId)

    if (allReviews && allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allReviews.length
      await supabase
        .from('marketplace_products')
        .update({
          rating: Math.round(avgRating * 10) / 10,
          review_count: allReviews.length,
        })
        .eq('id', productId)
    }

    return NextResponse.json({ success: true, reviewId: review?.id })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketplace/reviews POST' }), { status: 500 })
  }
}
