// ============================================================================
// ExamForge AI — Unified Webhook Processor
// ============================================================================
// Provider-aware webhook processing that:
// 1. Verifies signature per provider (HMAC-SHA256 for Flutterwave, HMAC-SHA512 for Paystack)
// 2. Checks idempotency (never processes the same event twice)
// 3. Checks replay protection (rejects stale events)
// 4. Routes to the appropriate provider handler based on event type
// 5. Records an audit entry for every processed webhook
// 6. Returns 200 only after successful processing
//
// SECURITY PRINCIPLES:
// 1. Never process without verified signature
// 2. Never process the same event twice
// 3. Never accept stale events
// 4. Never grant access before verified payment (handled in provider handlers)
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { createPaymentProvider } from '../providers/provider-factory'
import { verifyFlutterwaveSignature } from './signature-verification'
import { verifyPaystackSignature } from './signature-verification'
import { checkIdempotency, recordIdempotency } from './idempotency'
import { detectReplay } from './replay-protection'
import { handleFlutterwaveEvent } from './flutterwave-handler'
import { handlePaystackEvent } from './paystack-handler'
import { recordAuditEntry } from '../payment-audit'
import type { PaymentProvider, WebhookResult } from '../types-extended'
import { DEFAULT_REPLAY_TOLERANCE_MS } from '../types-extended'

const log = createLogger('billing:webhook:processor')

// ──────────────────────────────────────────────────────────────
// processWebhook
// ──────────────────────────────────────────────────────────────

/**
 * Processes a webhook event from a payment provider.
 *
 * Processing steps:
 * 1. Verify signature using provider-specific algorithm
 * 2. Check idempotency — skip if already processed
 * 3. Check replay protection — reject stale events
 * 4. Parse and route to the appropriate handler
 * 5. Record audit entry
 * 6. Record idempotency entry
 *
 * @param provider - The payment provider ('flutterwave' | 'paystack')
 * @param payload - The raw request body as a string
 * @param signature - The signature from the webhook header
 * @param headers - The request headers (for additional validation)
 * @returns WebhookResult indicating success or failure
 */
export async function processWebhook(
  provider: PaymentProvider,
  payload: string,
  signature: string,
  _headers: Record<string, string | undefined>
): Promise<WebhookResult> {
  log.info('Processing webhook', { provider, payloadLength: payload.length })

  // ─── Step 1: Verify signature ───
  const adapter = createPaymentProvider(provider)
  const webhookSecret = adapter.getWebhookSecret()

  if (!webhookSecret) {
    log.error('Webhook secret not configured', { provider })
    return { success: false, error: 'Webhook secret not configured' }
  }

  let signatureValid = false

  switch (provider) {
    case 'flutterwave':
      signatureValid = verifyFlutterwaveSignature(payload, signature, webhookSecret)
      break
    case 'paystack':
      signatureValid = verifyPaystackSignature(payload, signature, webhookSecret)
      break
  }

  if (!signatureValid) {
    log.security('Webhook signature verification failed', { provider })
    return { success: false, error: 'Invalid signature' }
  }

  // ─── Step 2: Parse payload ───
  let parsedPayload: Record<string, unknown>

  try {
    parsedPayload = JSON.parse(payload)
  } catch {
    log.warn('Invalid webhook payload — could not parse JSON', { provider })
    return { success: false, error: 'Invalid payload' }
  }

  // Extract event type and event ID
  const eventType = (parsedPayload.event as string) ?? ''
  const eventData = (parsedPayload.data as Record<string, unknown>) ?? {}
  const eventId = extractEventId(provider, parsedPayload, eventData)

  if (!eventType) {
    log.warn('Missing event type in webhook payload', { provider })
    return { success: false, error: 'Missing event type' }
  }

  // ─── Step 3: Check idempotency ───
  if (eventId) {
    const idempotencyResult = await checkIdempotency(eventId, provider)

    if (idempotencyResult.isProcessed) {
      log.info('Webhook event already processed (idempotent)', { provider, eventId })
      // Return success for idempotent events — provider expects 200
      return { success: true, eventId }
    }
  }

  // ─── Step 4: Check replay protection ───
  const eventTimestamp = extractEventTimestamp(provider, parsedPayload, eventData)

  if (eventId && eventTimestamp) {
    const isNotReplay = await detectReplay(eventId, provider, eventTimestamp, DEFAULT_REPLAY_TOLERANCE_MS)

    if (!isNotReplay) {
      log.security('Replay attack detected — rejecting webhook', { provider, eventId })
      return { success: false, error: 'Replay detected' }
    }
  }

  // ─── Step 5: Route to handler ───
  try {
    switch (provider) {
      case 'flutterwave':
        await handleFlutterwaveEvent(eventType, eventData)
        break
      case 'paystack':
        await handlePaystackEvent(eventType, eventData)
        break
    }
  } catch (error) {
    log.error('Webhook handler error', error, { provider, eventType, eventId })

    // Record failed idempotency
    if (eventId) {
      await recordIdempotency(eventId, provider, 'failed')
    }

    // Record audit entry for failure
    await recordAuditEntry(eventId ?? 'unknown', `webhook.${eventType}.failed`, provider, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return { success: false, error: 'Handler processing failed' }
  }

  // ─── Step 6: Record idempotency ───
  if (eventId) {
    await recordIdempotency(eventId, provider, 'processed')
  }

  // ─── Step 7: Record audit entry ───
  await recordAuditEntry(eventId ?? 'unknown', `webhook.${eventType}`, provider, {
    eventType,
    providerEventId: eventId,
  })

  log.info('Webhook processed successfully', { provider, eventType, eventId })

  return { success: true, eventId }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Extracts the event ID from the webhook payload.
 * Provider-specific event ID locations:
 * - Flutterwave: data.event_id or data.id
 * - Paystack: data.id or top-level id
 */
function extractEventId(
  provider: PaymentProvider,
  payload: Record<string, unknown>,
  data: Record<string, unknown>
): string {
  switch (provider) {
    case 'flutterwave':
      return String(data.event_id ?? data.id ?? payload.id ?? '')
    case 'paystack':
      return String(data.id ?? payload.id ?? '')
    default:
      return String(data.id ?? '')
  }
}

/**
 * Extracts the event timestamp from the webhook payload.
 * Provider-specific timestamp locations:
 * - Flutterwave: data.created_at or eventTime
 * - Paystack: data.created_at or paid_at
 */
function extractEventTimestamp(
  provider: PaymentProvider,
  payload: Record<string, unknown>,
  data: Record<string, unknown>
): string | number | undefined {
  switch (provider) {
    case 'flutterwave': {
      const eventTime = payload.eventTime as string | undefined
      const createdAt = data.created_at as string | undefined
      return eventTime ?? createdAt ?? undefined
    }
    case 'paystack': {
      const createdAt = data.created_at as string | undefined
      const paidAt = data.paid_at as string | undefined
      return createdAt ?? paidAt ?? undefined
    }
    default:
      return undefined
  }
}
