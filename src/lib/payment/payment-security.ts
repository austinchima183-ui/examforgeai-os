// ============================================================================
// ExamForge AI — Payment Verification & Security Layer
// ============================================================================
// Server-side payment verification with Flutterwave. NEVER trusts client-side
// payment confirmations. All purchases start as 'pending' and are only marked
// 'completed' after independent server-side verification with the payment provider.
//
// SECURITY PRINCIPLES:
// 1. Never set purchase status to 'completed' without provider verification
// 2. Always verify amount + currency match the product price
// 3. Always verify the transaction belongs to the claiming user
// 4. Always verify the product belongs to the seller
// 5. Issue licenses ONLY after all verifications pass
// 6. Revoke licenses on refund
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual, randomUUID } from 'crypto'

// ──────────────────────────────────────────────────────────────
// Flutterwave API Configuration
// ──────────────────────────────────────────────────────────────

export const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3'
export const FLUTTERWAVE_VERIFY_ENDPOINT = `${FLUTTERWAVE_API_BASE}/transactions/verify`
export const FLUTTERWAVE_REFUND_ENDPOINT = `${FLUTTERWAVE_API_BASE}/refunds`
export const FLUTTERWAVE_TRANSFER_ENDPOINT = `${FLUTTERWAVE_API_BASE}/transfers`

// Fail fast: payment keys must be set. Empty string is never valid.
// Use || instead of ?? so empty string values also trigger the undefined fallback.
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || undefined
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || undefined

if (process.env.NODE_ENV === 'production' && !FLUTTERWAVE_SECRET_KEY) {
  throw new Error('FLUTTERWAVE_SECRET_KEY environment variable is required in production. Application refuses to start without it.')
}
if (process.env.NODE_ENV === 'production' && !FLUTTERWAVE_PUBLIC_KEY) {
  throw new Error('FLUTTERWAVE_PUBLIC_KEY environment variable is required in production. Application refuses to start without it.')
}

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type PaymentProvider = 'flutterwave'

export interface PaymentVerificationResult {
  success: boolean
  status: 'successful' | 'failed' | 'pending' | 'cancelled'
  amount: number
  currency: string
  transactionRef: string
  flwRef: string
  customerId: string
  customerEmail: string
  createdAt: string
  error?: string
}

export interface AmountVerificationResult {
  valid: boolean
  expectedAmount: number
  actualAmount: number
  currency: string
  discrepancy?: number
}

export interface ProductOwnershipResult {
  valid: boolean
  productId: string
  sellerId: string
  actualSellerId?: string
  error?: string
}

export interface TransactionOwnershipResult {
  valid: boolean
  transactionRef: string
  userId: string
  actualUserId?: string
  error?: string
}

export interface LicenseGenerationResult {
  success: boolean
  licenseKey?: string
  licenseId?: string
  error?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  licenseRevoked?: boolean
  error?: string
}

// ──────────────────────────────────────────────────────────────
// verifyPaymentWithProvider
// ──────────────────────────────────────────────────────────────

/**
 * Verifies a payment with Flutterwave's server-side API.
 *
 * This is the ONLY authoritative way to confirm a payment happened.
 * Never trust client-side callbacks or webhook payloads alone —
 * always verify independently with the provider.
 *
 * @param transactionRef - The transaction reference (tx_ref) from Flutterwave
 * @param provider - The payment provider (currently only 'flutterwave')
 * @returns PaymentVerificationResult with verification details
 */
export async function verifyPaymentWithProvider(
  transactionRef: string,
  provider: PaymentProvider = 'flutterwave'
): Promise<PaymentVerificationResult> {
  if (!transactionRef) {
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef: '',
      flwRef: '',
      customerId: '',
      customerEmail: '',
      createdAt: '',
      error: 'Transaction reference is required',
    }
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    console.error('[payment-security] FATAL: FLUTTERWAVE_SECRET_KEY not configured')
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef,
      flwRef: '',
      customerId: '',
      customerEmail: '',
      createdAt: '',
      error: 'Payment provider not configured',
    }
  }

  try {
    const response = await fetch(
      `${FLUTTERWAVE_VERIFY_ENDPOINT}/${encodeURIComponent(transactionRef)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[payment-security] Flutterwave verify failed (${response.status}):`, errorBody)
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef,
        flwRef: '',
        customerId: '',
        customerEmail: '',
        createdAt: '',
        error: `Provider verification failed with status ${response.status}`,
      }
    }

    const data = await response.json()

    // Flutterwave response structure
    if (data.status !== 'success' || !data.data) {
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef,
        flwRef: '',
        customerId: '',
        customerEmail: '',
        createdAt: '',
        error: data.message ?? 'Verification returned unsuccessful status',
      }
    }

    const tx = data.data

    return {
      success: tx.status === 'successful',
      status: tx.status as PaymentVerificationResult['status'],
      amount: Number(tx.amount),
      currency: tx.currency as string,
      transactionRef: tx.tx_ref as string,
      flwRef: tx.flw_ref as string,
      customerId: String(tx.customer?.id ?? ''),
      customerEmail: (tx.customer?.email ?? '') as string,
      createdAt: (tx.created_at ?? new Date().toISOString()) as string,
    }
  } catch (error) {
    console.error('[payment-security] verifyPaymentWithProvider error:', error)
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef,
      flwRef: '',
      customerId: '',
      customerEmail: '',
      createdAt: '',
      error: error instanceof Error ? error.message : 'Unknown verification error',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// verifyAmount
// ──────────────────────────────────────────────────────────────

/**
 * Verifies that the paid amount matches the expected product price.
 *
 * Uses exact comparison for most currencies. For currencies with different
 * precision (e.g., JPY with 0 decimal places), tolerance is applied.
 *
 * SECURITY: This prevents partial-payment or price-manipulation attacks
 * where a user might modify the checkout amount client-side.
 *
 * @param expectedAmount - The product's listed price
 * @param actualAmount - The amount actually paid (from provider verification)
 * @param currency - The currency code (e.g., 'USD', 'NGN', 'KES')
 * @returns AmountVerificationResult
 */
export function verifyAmount(
  expectedAmount: number,
  actualAmount: number,
  currency: string
): AmountVerificationResult {
  // Zero-decimal currencies (JPY, KRW, VND, etc.) — allow 1 unit tolerance
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'ISK', 'CLP', 'PYG', 'UGX']
  const tolerance = zeroDecimalCurrencies.includes(currency.toUpperCase()) ? 1 : 0.01

  const discrepancy = Math.abs(expectedAmount - actualAmount)
  const valid = discrepancy <= tolerance

  if (!valid) {
    console.warn(
      `[payment-security] Amount mismatch: expected=${expectedAmount}, actual=${actualAmount}, ` +
      `currency=${currency}, discrepancy=${discrepancy}`
    )
  }

  return {
    valid,
    expectedAmount,
    actualAmount,
    currency,
    discrepancy: valid ? undefined : discrepancy,
  }
}

// ──────────────────────────────────────────────────────────────
// verifyProductOwnership
// ──────────────────────────────────────────────────────────────

/**
 * Verifies that the product belongs to the claimed seller.
 *
 * This prevents attacks where a buyer might try to purchase a product
 * at a cheaper price by substituting product IDs in the checkout request.
 *
 * @param productId - The product ID being purchased
 * @param sellerId - The claimed seller ID
 * @returns ProductOwnershipResult
 */
export async function verifyProductOwnership(
  productId: string,
  sellerId: string
): Promise<ProductOwnershipResult> {
  try {
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from('marketplace_products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return {
        valid: false,
        productId,
        sellerId,
        error: 'Product not found',
      }
    }

    const actualSellerId = product.seller_id as string
    const valid = actualSellerId === sellerId

    if (!valid) {
      console.warn(
        `[payment-security] Product ownership mismatch: product=${productId}, ` +
        `claimed_seller=${sellerId}, actual_seller=${actualSellerId}`
      )
    }

    return {
      valid,
      productId,
      sellerId,
      actualSellerId,
      error: valid ? undefined : 'Product does not belong to the claimed seller',
    }
  } catch (error) {
    console.error('[payment-security] verifyProductOwnership error:', error)
    return {
      valid: false,
      productId,
      sellerId,
      error: 'Failed to verify product ownership',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// verifyTransactionOwnership
// ──────────────────────────────────────────────────────────────

/**
 * Verifies that a transaction reference belongs to the user claiming it.
 *
 * This prevents one user from using another user's completed transaction
 * to complete their own purchase (transaction hijacking).
 *
 * @param transactionRef - The transaction reference (tx_ref)
 * @param userId - The user ID claiming ownership of this transaction
 * @returns TransactionOwnershipResult
 */
export async function verifyTransactionOwnership(
  transactionRef: string,
  userId: string
): Promise<TransactionOwnershipResult> {
  try {
    const supabase = await createClient()

    // Look up the pending order by transaction reference
    // (live schema: tx_ref lives on marketplace_orders)
    const { data: order, error } = await supabase
      .from('marketplace_orders')
      .select('buyer_id')
      .eq('flutterwave_tx_ref', transactionRef)
      .maybeSingle()

    if (error) {
      return {
        valid: false,
        transactionRef,
        userId,
        error: 'Failed to look up transaction',
      }
    }

    if (!order) {
      return {
        valid: false,
        transactionRef,
        userId,
        error: 'Transaction not found',
      }
    }

    const actualUserId = order.buyer_id as string
    const valid = actualUserId === userId

    if (!valid) {
      console.warn(
        `[payment-security] Transaction ownership mismatch: tx_ref=${transactionRef}, ` +
        `claimed_user=${userId}, actual_user=${actualUserId}`
      )
    }

    return {
      valid,
      transactionRef,
      userId,
      actualUserId,
      error: valid ? undefined : 'Transaction does not belong to this user',
    }
  } catch (error) {
    console.error('[payment-security] verifyTransactionOwnership error:', error)
    return {
      valid: false,
      transactionRef,
      userId,
      error: 'Failed to verify transaction ownership',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// generateLicense
// ──────────────────────────────────────────────────────────────

/**
 * Issues a license key after a verified payment.
 *
 * This should ONLY be called after all payment verifications have passed:
 * - Payment verified with provider
 * - Amount matches product price
 * - Transaction belongs to the user
 * - Product belongs to the seller
 *
 * @param productId - The product ID
 * @param userId - The buyer's user ID
 * @param transactionId - The purchase/transaction ID
 * @returns LicenseGenerationResult with the license key
 */
export async function generateLicense(
  productId: string,
  userId: string,
  transactionId: string
): Promise<LicenseGenerationResult> {
  try {
    const supabase = await createClient()

    // Generate a cryptographic license key: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const segments: string[] = []
    for (let s = 0; s < 5; s++) {
      let segment = ''
      const randomValues = new Uint8Array(5)
      crypto.getRandomValues(randomValues)
      for (let i = 0; i < 5; i++) {
        segment += chars[randomValues[i] % chars.length]
      }
      segments.push(segment)
    }
    const licenseKey = segments.join('-')

    // Get product info for license record
    const { data: product } = await supabase
      .from('marketplace_products')
      .select('title, seller_id')
      .eq('id', productId)
      .single()

    // Get buyer org (users table scopes by school_id)
    const { data: profile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .single()

    const orgId = (profile?.school_id ?? '') as string

    // Create license record (live schema: `licenses` table)
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        user_id: userId,
        school_id: null,
        license_type: 'single',
        license_key: licenseKey,
        seats_total: 1,
        seats_used: 0,
        is_active: true,
        issued_at: new Date().toISOString(),
        metadata: { product_id: productId, product_title: product?.title ?? '', order_id: transactionId } as Record<string, unknown>,
      })
      .select('id')
      .single()

    if (licenseError) {
      console.error('[payment-security] License creation error:', licenseError)
      return {
        success: false,
        error: 'Failed to create license record',
      }
    }

    // Update order state — the caller (verify-payment) owns the
    // pending→completed transition and creates the purchase row.
    // Here we only attach the license key to the completed purchase.
    await supabase
      .from('marketplace_purchases')
      .update({
        license_key: licenseKey,
        is_active: true,
      })
      .eq('buyer_id', userId)
      .eq('product_id', productId)

    return {
      success: true,
      licenseKey,
      licenseId: license?.id,
    }
  } catch (error) {
    console.error('[payment-security] generateLicense error:', error)
    return {
      success: false,
      error: 'Failed to generate license',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// handleRefund
// ──────────────────────────────────────────────────────────────

/**
 * Processes a refund and revokes the associated license.
 *
 * Steps:
 * 1. Call Flutterwave refund API
 * 2. Update purchase status to 'refunded'
 * 3. Deactivate the license
 *
 * @param transactionId - The purchase/transaction ID to refund
 * @param reason - The reason for the refund
 * @returns RefundResult
 */
export async function handleRefund(
  transactionId: string,
  reason: string
): Promise<RefundResult> {
  try {
    const supabase = await createClient()

    // Live schema: payment state lives on the ORDER (transactionId = order id)
    const { data: order, error: orderError } = await supabase
      .from('marketplace_orders')
      .select('id, buyer_id, seller_id, status, total_amount, currency, flutterwave_flw_ref, flutterwave_tx_ref')
      .eq('id', transactionId)
      .single()

    if (orderError || !order) {
      return {
        success: false,
        error: 'Purchase not found',
      }
    }

    if ((order.status as string) !== 'completed') {
      return {
        success: false,
        error: 'Only completed purchases can be refunded',
      }
    }

    // Get the product for license revocation
    const { data: orderItem } = await supabase
      .from('marketplace_order_items')
      .select('product_id')
      .eq('order_id', transactionId)
      .limit(1)
      .maybeSingle()

    const productId = orderItem?.product_id as string | undefined

    const flwRef = order.flutterwave_flw_ref as string | undefined
    const amount = order.total_amount as number

    // Call Flutterwave refund API
    let refundId: string | undefined

    if (FLUTTERWAVE_SECRET_KEY && flwRef) {
      try {
        const refundResponse = await fetch(FLUTTERWAVE_REFUND_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: flwRef,
            amount,
            note: reason,
          }),
        })

        if (refundResponse.ok) {
          const refundData = await refundResponse.json()
          refundId = refundData.data?.id as string
        } else {
          console.error('[payment-security] Flutterwave refund API error:', await refundResponse.text())
        }
      } catch (refundApiError) {
        console.error('[payment-security] Flutterwave refund API call failed:', refundApiError)
      }
    }

    // Mark the order refunded (live schema)
    await supabase
      .from('marketplace_orders')
      .update({
        status: 'refunded',
      })
      .eq('id', transactionId)

    // Deactivate the purchase ownership row
    await supabase
      .from('marketplace_purchases')
      .update({
        is_active: false,
      })
      .eq('buyer_id', order.buyer_id)
      .eq('product_id', productId ?? '__none__')

    // Revoke the license (live schema: `licenses` table, user-scoped)
    let licenseRevoked = false

    const { data: license } = await supabase
      .from('licenses')
      .select('id')
      .eq('user_id', order.buyer_id)
      .eq('is_active', true)
      .maybeSingle()

    if (license) {
      const { error: revokeError } = await supabase
        .from('licenses')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: reason,
        })
        .eq('id', license.id)

      licenseRevoked = !revokeError
      if (revokeError) {
        console.error('[payment-security] License revocation error:', revokeError)
      }
    }

    return {
      success: true,
      refundId,
      licenseRevoked,
    }
  } catch (error) {
    console.error('[payment-security] handleRefund error:', error)
    return {
      success: false,
      error: 'Failed to process refund',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// generateTransactionRef
// ──────────────────────────────────────────────────────────────

/**
 * Generates a unique transaction reference for tracking.
 * Format: EF-{uuid} (ExamForge prefix for identification)
 */
export function generateTransactionRef(): string {
  return `EF-${randomUUID()}`
}

// ──────────────────────────────────────────────────────────────
// initiateFlutterwaveCheckout
// ──────────────────────────────────────────────────────────────

/**
 * Initiates a Flutterwave checkout session.
 *
 * Returns the checkout link that the frontend should redirect the user to.
 * The purchase is created with status 'pending' — it will only be marked
 * 'completed' after server-side payment verification.
 *
 * @param params - Checkout parameters
 * @returns Checkout URL and transaction reference
 */
export async function initiateFlutterwaveCheckout(params: {
  productId: string
  productTitle: string
  amount: number
  currency: string
  userId: string
  userEmail: string
  userName: string
  redirectUrl: string
}): Promise<{ success: boolean; checkoutUrl?: string; transactionRef?: string; error?: string }> {
  const transactionRef = generateTransactionRef()

  if (!FLUTTERWAVE_PUBLIC_KEY) {
    return {
      success: false,
      error: 'Payment provider not configured',
    }
  }

  try {
    const response = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: transactionRef,
        amount: params.amount,
        currency: params.currency,
        redirect_url: params.redirectUrl,
        customer: {
          email: params.userEmail,
          name: params.userName,
        },
        customizations: {
          title: 'ExamForge Marketplace',
          description: `Purchase: ${params.productTitle}`,
        },
        meta: {
          product_id: params.productId,
          user_id: params.userId,
          source: 'examforge_marketplace',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[payment-security] Flutterwave checkout failed (${response.status}):`, errorBody)
      return {
        success: false,
        error: 'Failed to initiate checkout with payment provider',
      }
    }

    const data = await response.json()

    if (data.status !== 'success' || !data.data?.link) {
      return {
        success: false,
        error: data.message ?? 'Checkout initiation failed',
      }
    }

    return {
      success: true,
      checkoutUrl: data.data.link,
      transactionRef,
    }
  } catch (error) {
    console.error('[payment-security] initiateFlutterwaveCheckout error:', error)
    return {
      success: false,
      error: 'Failed to initiate checkout',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  return timingSafeEqual(bufA, bufB)
}

/**
 * Computes HMAC-SHA256 for webhook signature verification.
 */
export function computeHmacSha256(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}
