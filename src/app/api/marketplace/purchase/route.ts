import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { purchaseSchema } from '@/lib/validators/api-schemas'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
  const input = validateInput(purchaseSchema, rawBody)
  if ('error' in input) return input.error
  const { productId } = input.data

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_id', authResult.user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: false, error: 'Already purchased' })
  }

  // Get product price
  const { data: product } = await supabase
    .from('marketplace_products')
    .select('price, download_count')
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Create purchase
  const { data: purchase, error } = await supabase
    .from('marketplace_purchases')
    .insert({
      user_id: authResult.user.id,
      product_id: productId,
      amount: product.price,
      status: 'completed',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
  }

  // Update download count
  await supabase
    .from('marketplace_products')
    .update({ download_count: (product.download_count ?? 0) + 1 })
    .eq('id', productId)

  return NextResponse.json({ success: true, purchaseId: purchase?.id })
}
