import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// POST /api/marketplace-v2/listings/[id]/purchase — Purchase a product
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ─── Rate limit ───────────────────────────────────────────
    const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.strict)
    if (!allowed) return rateLimitError(retryAfter)

    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard ───────────────────────────────────────────
    const csrfV2 = enforceCsrf(req, auth)
    if (csrfV2) return csrfV2

    const { id } = await params
    const rawBody = await req.json()
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const organizationId = body.organizationId ?? auth.user.schoolId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required for purchase' },
        { status: 400 }
      )
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Verify product exists and is published
    const { data: product, error: productError } = await supabase
      .from('marketplace_products')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found or not available' }, { status: 404 })
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('marketplace_purchases')
      .select('id')
      .eq('product_id', id)
      .eq('buyer_id', auth.user.id)
      .eq('organization_id', organizationId)
      .single()

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Product already purchased', purchaseId: existingPurchase.id },
        { status: 409 }
      )
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('marketplace_purchases')
      .insert({
        product_id: id,
        buyer_id: auth.user.id,
        organization_id: organizationId,
        amount: product.price,
        currency: product.currency ?? 'USD',
        status: 'completed',
        payment_method: body.paymentMethod ?? 'wallet',
        license_type: body.licenseType ?? 'standard',
        metadata: {
          productTitle: product.title,
          productCategory: product.category,
          sellerId: product.author_id,
        },
      })
      .select()
      .single()

    if (purchaseError) {
      return NextResponse.json(
        { error: 'Failed to create purchase', details: purchaseError.message },
        { status: 500 }
      )
    }

    // Update product download count
    await supabase
      .from('marketplace_products')
      .update({ download_count: (product.download_count ?? 0) + 1 })
      .eq('id', id)

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to purchase product', details: String(error) },
      { status: 500 }
    )
  }
}
