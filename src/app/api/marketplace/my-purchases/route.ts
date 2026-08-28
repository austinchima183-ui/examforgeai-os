import { NextResponse, type NextRequest } from 'next/server'
import { requireApiAuth, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Marketplace My Purchases API Route
// ============================================================================
// GET /api/marketplace/my-purchases — Fetch user's purchases (auth required, userId from session)
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
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

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Get purchases
    const { data: purchases, error } = await supabase
      .from('marketplace_purchases')
      .select('product_id')
      .eq('buyer_id', userId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    const productIds = (purchases ?? []).map((p: { product_id: string }) => p.product_id)

    if (productIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    // Get product details
    const { data: products } = await supabase
      .from('marketplace_products')
      .select('id, title')
      .in('id', productIds)

    // Check which have reviews
    const { data: reviews } = await supabase
      .from('marketplace_reviews')
      .select('product_id')
      .eq('buyer_id', userId)

    const reviewedProducts = new Set((reviews ?? []).map((r: { product_id: string }) => r.product_id))

    const mapped = (products ?? []).map((p: { id: string; title: string }) => ({
      id: p.id,
      title: p.title,
      hasReview: reviewedProducts.has(p.id),
    }))

    return NextResponse.json({ products: mapped })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err, { route: 'marketplace/my-purchases' }), { status: 500 })
  }
}
