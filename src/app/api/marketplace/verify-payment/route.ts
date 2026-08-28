import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { requireSupabase } from '@/lib/supabase/server'
import {
  verifyPaymentWithProvider,
  verifyAmount,
  verifyTransactionOwnership,
  generateLicense,
} from '@/lib/payment/payment-security'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Marketplace Payment Verification Endpoint (live-schema)
// ============================================================================
// Schema: payment state lives in `marketplace_orders`. On successful
// verification the order transitions 'pending' → 'completed' and an ownership
// row is created in `marketplace_purchases`.
//
// SECURITY: This is the ONLY place where an order transitions
// from 'pending' to 'completed'. No other code path may do this.
//
// VERIFICATION STEPS (all must pass):
// 1. User is authenticated
// 2. Transaction reference is provided
// 3. Order belongs to this user (prevents transaction hijacking)
// 4. Payment is verified with Flutterwave server-side
// 5. Payment amount matches order total
// 6. Payment currency matches order currency
// 7. License is generated, order marked 'completed', purchase row created
// ============================================================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // ─── Step 1: Authenticate user ───────────────────────────────
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  const userId = authResult.user.id

  // ─── Step 2: Parse and validate input ────────────────────────
  const bodyJson = await parseJsonBody(request)
  if ('error' in bodyJson) return bodyJson.error
  const rawBody = bodyJson.data
  const verifyPaymentSchema = z.object({
    transactionRef: z.string().min(1, 'Transaction reference is required'),
    purchaseId: z.string().min(1, 'Order ID is required'),
  })
  const input = validateInput(verifyPaymentSchema, rawBody)
  if ('error' in input) return input.error
  const { transactionRef, purchaseId } = input.data // purchaseId = orderId

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // ─── Step 3: Verify the order exists and belongs to the user ──
  const { data: order, error: orderError } = await supabase
    .from('marketplace_orders')
    .select('id, buyer_id, seller_id, status, total_amount, currency, flutterwave_tx_ref, paid_at')
    .eq('id', purchaseId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // SECURITY: order must belong to the requesting user
  if (order.buyer_id !== userId) {
    return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 })
  }

  // Already completed — idempotent success
  if ((order.status as string) === 'completed') {
    return NextResponse.json({
      success: true,
      status: 'completed',
      message: 'Payment already verified and purchase completed',
    })
  }

  // Not pending — cannot verify
  if ((order.status as string) !== 'pending') {
    return NextResponse.json(
      { error: `Order is in '${order.status}' state, cannot verify` },
      { status: 400 }
    )
  }

  // ─── Step 4: Verify transaction belongs to this user ─────────
  // SECURITY: Prevents transaction hijacking — one user using
  // another user's completed transaction to claim a product
  const ownershipResult = await verifyTransactionOwnership(
    transactionRef,
    userId
  )

  if (!ownershipResult.valid) {
    console.warn(
      `[verify-payment] Transaction ownership verification failed: ` +
      `tx_ref=${transactionRef}, user=${userId}, error=${ownershipResult.error}`
    )
    return NextResponse.json(
      { error: 'Transaction does not belong to this user' },
      { status: 403 }
    )
  }

  // ─── Step 5: Verify payment with Flutterwave (server-side) ───
  // SECURITY: This is the critical step. We call Flutterwave's
  // verification API directly — we NEVER trust client-side data.
  const providerResult = await verifyPaymentWithProvider(transactionRef)

  if (!providerResult.success) {
    // Payment not successful — update order status
    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', purchaseId)

    return NextResponse.json(
      {
        success: false,
        status: providerResult.status,
        error: providerResult.error ?? 'Payment verification failed — payment was not successful',
      },
      { status: 400 }
    )
  }

  // ─── Step 6: Verify amount matches order total ────────────────
  // SECURITY: Prevents price manipulation attacks where a user
  // modifies the checkout amount to pay less than the product price
  const amountResult = verifyAmount(
    order.total_amount as number,
    providerResult.amount,
    providerResult.currency
  )

  if (!amountResult.valid) {
    console.error(
      `[verify-payment] Amount mismatch: expected=${amountResult.expectedAmount}, ` +
      `actual=${amountResult.actualAmount}, currency=${amountResult.currency}, ` +
      `discrepancy=${amountResult.discrepancy}`
    )

    // Mark order as failed — possible fraud attempt
    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', purchaseId)

    return NextResponse.json(
      {
        success: false,
        error: 'Payment amount does not match order total',
      },
      { status: 400 }
    )
  }

  // ─── Step 7: Verify currency matches ─────────────────────────
  const expectedCurrency = ((order.currency as string) ?? 'USD').toUpperCase()
  const actualCurrency = (providerResult.currency ?? 'USD').toUpperCase()

  if (expectedCurrency !== actualCurrency) {
    console.error(
      `[verify-payment] Currency mismatch: expected=${expectedCurrency}, actual=${actualCurrency}`
    )

    await supabase
      .from('marketplace_orders')
      .update({ status: 'failed' })
      .eq('id', purchaseId)

    return NextResponse.json(
      {
        success: false,
        error: 'Payment currency does not match order currency',
      },
      { status: 400 }
    )
  }

  // ─── Step 8: Get the product from the order items ────────────
  const { data: orderItem } = await supabase
    .from('marketplace_order_items')
    .select('product_id, license_type')
    .eq('order_id', purchaseId)
    .limit(1)
    .maybeSingle()

  const productId = orderItem?.product_id as string | undefined
  if (!productId) {
    console.error(`[verify-payment] No order item found for order ${purchaseId}`)
    return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
  }

  // ─── Step 9: Generate license and complete the purchase ──────
  // This is the ONLY place that transitions status to 'completed'
  const licenseResult = await generateLicense(productId, userId, purchaseId)

  if (!licenseResult.success) {
    console.error(
      `[verify-payment] License generation failed for order ${purchaseId}: ${licenseResult.error}`
    )

    // Payment verified but license failed — order still completed so the
    // user is not charged twice; license can be re-issued by support
    await supabase
      .from('marketplace_orders')
      .update({ status: 'completed', paid_at: new Date().toISOString() })
      .eq('id', purchaseId)

    return NextResponse.json({
      success: true,
      status: 'completed',
      warning: 'Payment verified but license generation failed. Please contact support.',
      purchaseId,
    })
  }

  // ─── Step 10: Complete order + create purchase ownership row ──
  await supabase
    .from('marketplace_orders')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      flutterwave_flw_ref: providerResult.flwRef ?? null,
    })
    .eq('id', purchaseId)

  const { data: purchase } = await supabase
    .from('marketplace_purchases')
    .insert({
      buyer_id: userId,
      product_id: productId,
      license_type: (orderItem?.license_type as string) ?? 'individual',
      license_key: licenseResult.licenseKey,
      is_active: true,
    })
    .select('id')
    .single()

  // ─── Step 11: Update product download count ──────────────────
  const { data: product } = await supabase
    .from('marketplace_products')
    .select('download_count')
    .eq('id', productId)
    .single()

  if (product) {
    await supabase
      .from('marketplace_products')
      .update({ download_count: (product.download_count ?? 0) + 1 })
      .eq('id', productId)
  }

  // ─── Success ─────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    status: 'completed',
    purchaseId: purchase?.id ?? purchaseId,
    orderId: purchaseId,
    licenseKey: licenseResult.licenseKey,
    message: 'Payment verified and purchase completed successfully',
  })
}

// ──────────────────────────────────────────────────────────────
// GET: Check payment verification status
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const purchaseId = searchParams.get('purchaseId')

  if (!purchaseId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data: order, error } = await supabase
    .from('marketplace_orders')
    .select('id, status, total_amount, currency, flutterwave_tx_ref, marketplace_order_items(product_id)')
    .eq('id', purchaseId)
    .eq('buyer_id', authResult.user.id)  // Ensure user owns this order
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const item = (order.marketplace_order_items as Array<{ product_id: string }> | null)?.[0]

  return NextResponse.json({
    purchaseId: order.id,
    orderId: order.id,
    status: order.status,
    productId: item?.product_id ?? null,
    amount: order.total_amount,
    currency: order.currency,
    transactionRef: order.flutterwave_tx_ref,
    hasLicense: order.status === 'completed',
  })
}
