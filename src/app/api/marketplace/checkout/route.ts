import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { requireSupabase } from '@/lib/supabase/server'
import {
  initiateFlutterwaveCheckout,
  generateTransactionRef,
} from '@/lib/payment/payment-security'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { checkoutSchema } from '@/lib/validators/api-schemas'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Marketplace Checkout (SECURED, live-schema aligned)
// ============================================================================
// Schema: payment state lives in `marketplace_orders` (status, tx_ref,
// total_amount, currency); ownership lives in `marketplace_purchases`
// (buyer_id, product_id, is_active, license_key).
//
// FLOW:
// 1. Reject if user already owns an active purchase for the product
// 2. Free product → grant purchase directly (is_active: true)
// 3. Paid product → create ORDER with status 'pending' (NEVER 'completed')
// 4. Initiate Flutterwave checkout, return checkout URL + transaction ref
// 5. Webhook/verify-payment confirms payment server-side, then:
//    order → 'completed' + purchase row created
// ============================================================================

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
  const csrfMkt = enforceCsrf(request, authResult)
  if (csrfMkt) return csrfMkt

  const bodyJson = await parseJsonBody(request)
  if ('error' in bodyJson) return bodyJson.error
  const rawBody = bodyJson.data
  const marketplaceCheckoutSchema = checkoutSchema.extend({ licenseType: z.enum(['individual', 'site', 'district']).optional() })
  const input = validateInput(marketplaceCheckoutSchema, rawBody)
  if ('error' in input) return input.error
  const data = input.data as unknown as { productId: string; licenseType?: string }
  const { productId, licenseType } = data

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // ─── Step 1: Check if already purchased (ownership check) ─────
  const { data: existing } = await supabase
    .from('marketplace_purchases')
    .select('id, is_active')
    .eq('buyer_id', authResult.user.id)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      success: false,
      error: 'Already purchased',
    })
  }

  // ─── Step 2: Get product details ─────────────────────────────
  const { data: product } = await supabase
    .from('marketplace_products')
    .select('id, title, price, currency, seller_id, download_count')
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  if ((product.price ?? 0) <= 0) {
    // Free product — can be acquired without payment
    const { data: purchase, error } = await supabase
      .from('marketplace_purchases')
      .insert({
        buyer_id: authResult.user.id,
        product_id: productId,
        license_type: licenseType ?? 'individual',
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to complete free purchase' }, { status: 500 })
    }

    // Update download count
    await supabase
      .from('marketplace_products')
      .update({ download_count: (product.download_count ?? 0) + 1 })
      .eq('id', productId)

    return NextResponse.json({
      success: true,
      purchaseId: purchase?.id,
      free: true,
    })
  }

  // ─── Step 3: Create ORDER with status 'pending' ───────────────
  // SECURITY: order stays 'pending' until server-side payment verification
  const transactionRef = generateTransactionRef()
  const orderNumber = `EF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data: order, error: orderError } = await supabase
    .from('marketplace_orders')
    .insert({
      order_number: orderNumber,
      buyer_id: authResult.user.id,
      seller_id: product.seller_id,
      status: 'pending',            // ← CRITICAL: never 'completed' pre-payment
      subtotal: product.price,
      total_amount: product.price,
      currency: product.currency ?? 'USD',
      flutterwave_tx_ref: transactionRef,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[checkout] Order creation error:', orderError)
    return NextResponse.json({ error: 'Failed to initiate purchase' }, { status: 500 })
  }

  // Order line item (price snapshot)
  await supabase
    .from('marketplace_order_items')
    .insert({
      order_id: order.id,
      product_id: productId,
      seller_id: product.seller_id,
      price_at_purchase: product.price,
      currency: product.currency ?? 'USD',
      license_type: licenseType ?? 'individual',
    })

  // ─── Step 4: Initiate Flutterwave checkout ───────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const checkoutResult = await initiateFlutterwaveCheckout({
    productId,
    productTitle: product.title,
    amount: product.price,
    currency: product.currency ?? 'USD',
    userId: authResult.user.id,
    userEmail: authResult.user.email,
    userName: authResult.user.fullName,
    redirectUrl: `${baseUrl}/marketplace/verify?tx_ref=${transactionRef}&order_id=${order.id}`,
  })

  if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
    // Checkout initiation failed — mark order as failed
    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', order.id)

    return NextResponse.json(
      {
        success: false,
        error: checkoutResult.error ?? 'Failed to initiate payment checkout',
      },
      { status: 500 }
    )
  }

  // ─── Step 5: Return checkout URL + transaction reference ─────
  return NextResponse.json({
    success: true,
    orderId: order.id,
    purchaseId: order.id, // backward-compatible alias for older clients
    transactionRef: checkoutResult.transactionRef ?? transactionRef,
    checkoutUrl: checkoutResult.checkoutUrl,
    // Frontend should redirect user to checkoutUrl
  })
}
