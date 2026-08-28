import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { requireApiAuth, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth guard ───────────────────────────────────────────
  const authGet = await requireApiAuth(request)
  if (authGet instanceof NextResponse) return authGet

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select(`
      id, title, description, category, price, status,
      rating, total_reviews, created_at
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  // Get sales data
  const productIds = (products ?? []).map((p: { id: string }) => p.id)
  const { data: purchases } = await supabase
    .from('marketplace_purchases')
    .select('product_id, amount')
    .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
    .eq('status', 'completed')

  const salesMap = new Map<string, { count: number; revenue: number }>()
  for (const p of purchases ?? []) {
    const existing = salesMap.get(p.product_id) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += p.amount ?? 0
    salesMap.set(p.product_id, existing)
  }

  const mapped = (products ?? []).map((p: { id: string; title: string; description: string | null; category: string | null; price: number | null; status: string | null; rating: number | null; total_reviews: number | null; created_at: string }) => {
    const sales = salesMap.get(p.id) ?? { count: 0, revenue: 0 }
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? '',
      category: p.category ?? 'exam_pack',
      price: p.price ?? 0,
      status: p.status ?? 'draft',
      salesCount: sales.count,
      revenue: sales.revenue,
      rating: p.rating ?? 0,
      reviewCount: p.total_reviews ?? 0,
      createdAt: p.created_at,
    }
  })

  return NextResponse.json({ products: mapped })
}

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed: postAllowed, retryAfter: postRetry } = await apiRateLimit(request, RATE_LIMITS.write)
  if (!postAllowed) return rateLimitError(postRetry)

  const authResult = await (await import('@/lib/auth/require-auth')).getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfSeller = enforceCsrf(request, authResult)
  if (csrfSeller) return csrfSeller

  const { title, description, category, price } = await request.json()
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data: product, error } = await supabase
    .from('marketplace_products')
    .insert({
      title,
      description: description ?? '',
      category: category ?? 'exam_pack',
      price: price ?? 0,
      currency: 'NGN',
      author_id: authResult.user.id,
      status: 'draft',
      rating: 0,
      review_count: 0,
      download_count: 0,
      is_featured: false,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ success: true, productId: product?.id })
}
