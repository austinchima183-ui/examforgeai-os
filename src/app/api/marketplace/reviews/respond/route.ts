import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  const { reviewId, response } = await request.json()
  if (!reviewId || !response) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Verify seller owns the product
  const { data: review } = await supabase
    .from('marketplace_reviews')
    .select('product_id')
    .eq('id', reviewId)
    .single()

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  const { data: product } = await supabase
    .from('marketplace_products')
    .select('author_id')
    .eq('id', review.product_id)
    .single()

  if (!product || product.author_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('marketplace_reviews')
    .update({ seller_response: response })
    .eq('id', reviewId)

  if (error) {
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
