// ============================================================================
// ExamForge AI — Paystack Payment Provider Integration
// ============================================================================
// Server-side Paystack integration for initializing transactions, verifying
// payments, charging recurring authorizations, and processing refunds.
//
// SECURITY PRINCIPLES:
// 1. Never trust client-side payment confirmations
// 2. Always verify amount + currency match expected values
// 3. Always verify the transaction belongs to the claiming user
// 4. Recurring charges require verified authorization codes
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { PaymentVerificationResult, RefundResult } from '@/lib/payment/payment-security'
import type { PaystackConfig, PaystackInitResult } from '../types-extended'

const log = createLogger('billing:paystack')

// ──────────────────────────────────────────────────────────────
// Paystack API Configuration
// ──────────────────────────────────────────────────────────────

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY ?? ''
const PAYSTACK_API_BASE = 'https://api.paystack.co'

function getPaystackConfig(): PaystackConfig {
  return {
    secretKey: PAYSTACK_SECRET_KEY,
    publicKey: PAYSTACK_PUBLIC_KEY,
    baseUrl: PAYSTACK_API_BASE,
  }
}

// ──────────────────────────────────────────────────────────────
// initializePaystackTransaction
// ──────────────────────────────────────────────────────────────

/**
 * Initializes a Paystack transaction for checkout.
 *
 * Returns an authorization URL that the frontend should redirect the user to.
 * The transaction starts as 'pending' — it should only be marked 'completed'
 * after independent server-side verification.
 *
 * SECURITY: Amount is specified in kobo (smallest currency unit for NGN).
 * Paystack requires amounts in the smallest currency unit.
 *
 * @param email - Customer email address
 * @param amount - Amount in the currency's major unit (e.g., Naira, not kobo)
 * @param currency - Currency code (e.g., 'NGN', 'GHS', 'KES')
 * @param reference - Unique transaction reference
 * @param metadata - Additional metadata to attach to the transaction
 * @returns PaystackInitResult with authorization URL
 */
export async function initializePaystackTransaction(
  email: string,
  amount: number,
  currency: string,
  reference: string,
  metadata?: Record<string, unknown>
): Promise<PaystackInitResult> {
  if (!email || !amount || !reference) {
    return { success: false, error: 'Email, amount, and reference are required' }
  }

  const config = getPaystackConfig()

  if (!config.secretKey) {
    log.error('FATAL: PAYSTACK_SECRET_KEY not configured')
    return { success: false, error: 'Payment provider not configured' }
  }

  // Convert amount to smallest currency unit (kobo for NGN, pesewas for GHS, etc.)
  const amountInSmallestUnit = Math.round(amount * 100)

  try {
    const response = await fetch(`${config.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInSmallestUnit,
        currency,
        reference,
        metadata: {
          ...metadata,
          source: 'examforge_billing',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error('Paystack initialize failed', null, { status: response.status, errorBody })
      return { success: false, error: `Paystack initialization failed with status ${response.status}` }
    }

    const data = await response.json()

    if (!data.status || !data.data?.authorization_url) {
      return { success: false, error: data.message ?? 'Initialization returned unsuccessful status' }
    }

    log.info('Paystack transaction initialized', { reference, amount, currency })

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    }
  } catch (error) {
    log.error('initializePaystackTransaction error', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown initialization error' }
  }
}

// ──────────────────────────────────────────────────────────────
// verifyPaystackTransaction
// ──────────────────────────────────────────────────────────────

/**
 * Verifies a Paystack transaction by reference.
 *
 * This is the ONLY authoritative way to confirm a Paystack payment happened.
 * Never trust client-side callbacks or webhook payloads alone —
 * always verify independently with the provider.
 *
 * @param reference - The transaction reference to verify
 * @returns PaymentVerificationResult with verification details
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaymentVerificationResult> {
  if (!reference) {
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

  const config = getPaystackConfig()

  if (!config.secretKey) {
    log.error('FATAL: PAYSTACK_SECRET_KEY not configured')
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef: reference,
      flwRef: '',
      customerId: '',
      customerEmail: '',
      createdAt: '',
      error: 'Payment provider not configured',
    }
  }

  try {
    const response = await fetch(
      `${config.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      log.error('Paystack verify failed', null, { status: response.status, errorBody })
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef: reference,
        flwRef: '',
        customerId: '',
        customerEmail: '',
        createdAt: '',
        error: `Provider verification failed with status ${response.status}`,
      }
    }

    const data = await response.json()

    if (!data.status || !data.data) {
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef: reference,
        flwRef: '',
        customerId: '',
        customerEmail: '',
        createdAt: '',
        error: data.message ?? 'Verification returned unsuccessful status',
      }
    }

    const tx = data.data

    // Map Paystack status to our internal status
    const statusMap: Record<string, PaymentVerificationResult['status']> = {
      success: 'successful',
      failed: 'failed',
      abandoned: 'cancelled',
      pending: 'pending',
    }

    // Convert amount from smallest unit back to major unit
    const amountInMajorUnit = Number(tx.amount) / 100

    log.info('Paystack transaction verified', {
      reference,
      status: tx.status,
      amount: amountInMajorUnit,
      currency: tx.currency,
    })

    return {
      success: tx.status === 'success',
      status: statusMap[tx.status] ?? 'pending',
      amount: amountInMajorUnit,
      currency: tx.currency as string,
      transactionRef: tx.reference as string,
      flwRef: String(tx.id ?? ''), // Paystack transaction ID as provider reference
      customerId: String(tx.customer?.id ?? tx.metadata?.user_id ?? ''),
      customerEmail: (tx.customer?.email ?? '') as string,
      createdAt: (tx.created_at ?? new Date().toISOString()) as string,
    }
  } catch (error) {
    log.error('verifyPaystackTransaction error', error)
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef: reference,
      flwRef: '',
      customerId: '',
      customerEmail: '',
      createdAt: '',
      error: error instanceof Error ? error.message : 'Unknown verification error',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// chargePaystackAuthorization
// ──────────────────────────────────────────────────────────────

/**
 * Charges a saved Paystack authorization code for recurring billing.
 *
 * This is used for automatic subscription renewals where the customer
 * has previously authorized recurring charges on their payment method.
 *
 * SECURITY: The authorization code must have been obtained from a
 * previously verified transaction. Never accept authorization codes
 * from client-side input.
 *
 * @param email - Customer email
 * @param authorizationCode - Saved authorization code from previous transaction
 * @param amount - Amount in currency major unit
 * @param currency - Currency code
 * @returns PaymentVerificationResult
 */
export async function chargePaystackAuthorization(
  email: string,
  authorizationCode: string,
  amount: number,
  currency: string
): Promise<PaymentVerificationResult> {
  if (!email || !authorizationCode || !amount) {
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
      error: 'Email, authorization code, and amount are required',
    }
  }

  const config = getPaystackConfig()

  if (!config.secretKey) {
    log.error('FATAL: PAYSTACK_SECRET_KEY not configured for recurring charge')
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef: '',
      flwRef: '',
      customerId: '',
      customerEmail: email,
      createdAt: '',
      error: 'Payment provider not configured',
    }
  }

  const amountInSmallestUnit = Math.round(amount * 100)

  try {
    const response = await fetch(`${config.baseUrl}/transaction/charge_authorization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        authorization_code: authorizationCode,
        amount: amountInSmallestUnit,
        currency,
        metadata: { source: 'examforge_recurring' },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error('Paystack recurring charge failed', null, { status: response.status, errorBody })
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef: '',
        flwRef: '',
        customerId: '',
        customerEmail: email,
        createdAt: '',
        error: `Recurring charge failed with status ${response.status}`,
      }
    }

    const data = await response.json()

    if (!data.status || !data.data) {
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        transactionRef: '',
        flwRef: '',
        customerId: '',
        customerEmail: email,
        createdAt: '',
        error: data.message ?? 'Recurring charge returned unsuccessful status',
      }
    }

    const tx = data.data

    log.info('Paystack recurring charge processed', {
      reference: tx.reference,
      status: tx.status,
      amount,
      currency,
    })

    return {
      success: tx.status === 'success',
      status: tx.status === 'success' ? 'successful' : tx.status === 'failed' ? 'failed' : 'pending',
      amount,
      currency,
      transactionRef: tx.reference as string,
      flwRef: String(tx.id ?? ''),
      customerId: String(tx.customer?.id ?? ''),
      customerEmail: email,
      createdAt: (tx.created_at ?? new Date().toISOString()) as string,
    }
  } catch (error) {
    log.error('chargePaystackAuthorization error', error)
    return {
      success: false,
      status: 'failed',
      amount: 0,
      currency: '',
      transactionRef: '',
      flwRef: '',
      customerId: '',
      customerEmail: email,
      createdAt: '',
      error: error instanceof Error ? error.message : 'Unknown recurring charge error',
    }
  }
}

// ──────────────────────────────────────────────────────────────
// refundPaystackTransaction
// ──────────────────────────────────────────────────────────────

/**
 * Processes a refund via Paystack.
 *
 * @param reference - The transaction reference to refund
 * @param amount - Optional partial refund amount (in major unit). If omitted, full refund.
 * @returns RefundResult
 */
export async function refundPaystackTransaction(
  reference: string,
  amount?: number
): Promise<RefundResult> {
  if (!reference) {
    return { success: false, error: 'Transaction reference is required' }
  }

  const config = getPaystackConfig()

  if (!config.secretKey) {
    log.error('FATAL: PAYSTACK_SECRET_KEY not configured for refund')
    return { success: false, error: 'Payment provider not configured' }
  }

  try {
    const body: Record<string, unknown> = { transaction: reference }
    if (amount) {
      body.amount = Math.round(amount * 100) // Convert to smallest unit
    }

    const response = await fetch(`${config.baseUrl}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error('Paystack refund failed', null, { status: response.status, errorBody })
      return { success: false, error: `Refund failed with status ${response.status}` }
    }

    const data = await response.json()

    if (!data.status || !data.data) {
      return { success: false, error: data.message ?? 'Refund returned unsuccessful status' }
    }

    log.info('Paystack refund processed', {
      reference,
      refundId: data.data.id,
      amount: amount ?? 'full',
    })

    return {
      success: true,
      refundId: String(data.data.id),
    }
  } catch (error) {
    log.error('refundPaystackTransaction error', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown refund error' }
  }
}
