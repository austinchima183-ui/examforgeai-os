// ============================================================================
// ExamForge AI — Webhook Signature Verification
// ============================================================================
// Provider-specific webhook signature verification with timing-safe comparison
// to prevent timing attacks. Each provider uses a different HMAC algorithm:
// - Flutterwave: HMAC-SHA256
// - Paystack: HMAC-SHA512
// ============================================================================

import { createHmac, timingSafeEqual } from 'crypto'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('billing:webhook:signature')

// ──────────────────────────────────────────────────────────────
// verifyFlutterwaveSignature
// ──────────────────────────────────────────────────────────────

/**
 * Verifies a Flutterwave webhook signature using HMAC-SHA256.
 *
 * Flutterwave signs webhook payloads with HMAC-SHA256 using the webhook
 * secret hash. We use timing-safe comparison to prevent timing attacks
 * that could leak information about the secret key.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the X-Flutterwave-Signature header
 * @param secret - The Flutterwave webhook secret hash
 * @returns True if the signature is valid, false otherwise
 */
export function verifyFlutterwaveSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    log.warn('Missing payload, signature, or secret for Flutterwave verification')
    return false
  }

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }

    const sigBuf = Buffer.from(signature, 'utf8')
    const expBuf = Buffer.from(expectedSignature, 'utf8')

    const isValid = timingSafeEqual(sigBuf, expBuf)

    if (!isValid) {
      log.security('Flutterwave webhook signature mismatch', {
        signatureLength: signature.length,
      })
    }

    return isValid
  } catch (error) {
    log.error('Flutterwave signature verification error', error)
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// verifyPaystackSignature
// ──────────────────────────────────────────────────────────────

/**
 * Verifies a Paystack webhook signature using HMAC-SHA512.
 *
 * Paystack signs webhook payloads with HMAC-SHA512 using the webhook
 * secret key. We use timing-safe comparison for the same security
 * reasons as the Flutterwave verification.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the X-Paystack-Signature header
 * @param secret - The Paystack webhook secret key
 * @returns True if the signature is valid, false otherwise
 */
export function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    log.warn('Missing payload, signature, or secret for Paystack verification')
    return false
  }

  try {
    const expectedSignature = createHmac('sha512', secret)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false
    }

    const sigBuf = Buffer.from(signature, 'utf8')
    const expBuf = Buffer.from(expectedSignature, 'utf8')

    const isValid = timingSafeEqual(sigBuf, expBuf)

    if (!isValid) {
      log.security('Paystack webhook signature mismatch', {
        signatureLength: signature.length,
      })
    }

    return isValid
  } catch (error) {
    log.error('Paystack signature verification error', error)
    return false
  }
}
