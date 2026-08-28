// ============================================================================
// ExamForge AI — Payment Security Test Suite
// ============================================================================
// Tests the complete payment security layer including:
// - Successful payment flow
// - Failed payment (no license issued)
// - Duplicate webhook handling (idempotent)
// - Forged webhook rejection
// - Wrong amount rejection
// - Wrong product rejection
// - Wrong user rejection (transaction hijacking)
// - Refund license revocation
// - Replay attack prevention
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ──────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────

// Mock Supabase client — use vi.hoisted to share mock between factory and test
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    // Default to "not found" — individual tests override with mockResolvedValueOnce
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  return { mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Mock fetch for Flutterwave API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// ──────────────────────────────────────────────────────────────
// Import modules after mocks are set up
// ──────────────────────────────────────────────────────────────

import {
  verifyPaymentWithProvider,
  verifyAmount,
  verifyProductOwnership,
  verifyTransactionOwnership,
  generateLicense,
  handleRefund,
  generateTransactionRef,
  FLUTTERWAVE_VERIFY_ENDPOINT,
  FLUTTERWAVE_REFUND_ENDPOINT,
} from '../payment-security'

import {
  verifyWebhookSignature,
  preventWebhookReplay,
  validateWebhookPayload,
  isDuplicateEvent,
  recordProcessedEvent,
  clearEventStore,
} from '../webhook-security'

// ──────────────────────────────────────────────────────────────
// Test Data
// ──────────────────────────────────────────────────────────────

const VALID_TX_REF = 'EF-12345678-abcd-1234-abcd-123456789012'
const VALID_FLW_REF = 'FLW-MOCK-123456'
const VALID_USER_ID = 'user-001'
const VALID_PRODUCT_ID = 'product-001'
const VALID_SELLER_ID = 'seller-001'
const VALID_AMOUNT = 29.99
const VALID_CURRENCY = 'USD'

const VALID_FLUTTERWAVE_RESPONSE = {
  status: 'success',
  message: 'Transaction fetched successfully',
  data: {
    id: 12345,
    tx_ref: VALID_TX_REF,
    flw_ref: VALID_FLW_REF,
    amount: VALID_AMOUNT,
    currency: VALID_CURRENCY,
    status: 'successful',
    payment_type: 'card',
    customer: {
      id: 1,
      email: 'buyer@example.com',
      name: 'Test Buyer',
    },
    created_at: new Date().toISOString(),
  },
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('Payment Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEventStore()
  })

  // ──────────────────────────────────────────────────────────────
  // 1. Successful Payment Flow
  // ──────────────────────────────────────────────────────────────

  describe('successful payment flow', () => {
    it('should verify a successful payment with Flutterwave', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => VALID_FLUTTERWAVE_RESPONSE,
      })

      const result = await verifyPaymentWithProvider(VALID_TX_REF)

      expect(result.success).toBe(true)
      expect(result.status).toBe('successful')
      expect(result.amount).toBe(VALID_AMOUNT)
      expect(result.currency).toBe(VALID_CURRENCY)
      expect(result.transactionRef).toBe(VALID_TX_REF)
      expect(result.flwRef).toBe(VALID_FLW_REF)
      expect(result.error).toBeUndefined()

      // Verify the correct API endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        `${FLUTTERWAVE_VERIFY_ENDPOINT}/${VALID_TX_REF}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
          }),
        })
      )
    })

    it('should verify amount matches product price', () => {
      const result = verifyAmount(VALID_AMOUNT, VALID_AMOUNT, VALID_CURRENCY)

      expect(result.valid).toBe(true)
      expect(result.expectedAmount).toBe(VALID_AMOUNT)
      expect(result.actualAmount).toBe(VALID_AMOUNT)
      expect(result.discrepancy).toBeUndefined()
    })

    it('should generate a transaction reference', () => {
      const ref = generateTransactionRef()

      expect(ref).toMatch(/^EF-[0-9a-f-]+$/)
      expect(ref.length).toBeGreaterThan(10)
    })

    it('should generate unique transaction references', () => {
      const ref1 = generateTransactionRef()
      const ref2 = generateTransactionRef()

      expect(ref1).not.toBe(ref2)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 2. Failed Payment — No License
  // ──────────────────────────────────────────────────────────────

  describe('failed payment — no license issued', () => {
    it('should reject a failed payment from Flutterwave', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            ...VALID_FLUTTERWAVE_RESPONSE.data,
            status: 'failed',
          },
        }),
      })

      const result = await verifyPaymentWithProvider(VALID_TX_REF)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
    })

    it('should reject a pending payment from Flutterwave', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            ...VALID_FLUTTERWAVE_RESPONSE.data,
            status: 'pending',
          },
        }),
      })

      const result = await verifyPaymentWithProvider(VALID_TX_REF)

      expect(result.success).toBe(false)
      expect(result.status).toBe('pending')
    })

    it('should reject a cancelled payment from Flutterwave', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            ...VALID_FLUTTERWAVE_RESPONSE.data,
            status: 'cancelled',
          },
        }),
      })

      const result = await verifyPaymentWithProvider(VALID_TX_REF)

      expect(result.success).toBe(false)
      expect(result.status).toBe('cancelled')
    })

    it('should handle Flutterwave API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const result = await verifyPaymentWithProvider(VALID_TX_REF)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error).toContain('500')
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 3. Duplicate Webhook — Idempotent
  // ──────────────────────────────────────────────────────────────

  describe('duplicate webhook handling', () => {
    it('should detect duplicate events', async () => {
      const eventId = 'charge.completed:EF-123:456'

      // First event — not a duplicate
      await recordProcessedEvent(eventId, 'processed')
      expect(await isDuplicateEvent(eventId)).toBe(true)

      // Same event again — is a duplicate
      expect(await isDuplicateEvent(eventId)).toBe(true)
    })

    it('should prevent replay of duplicate events', async () => {
      const eventId = 'charge.completed:EF-456:789'
      const timestamp = Date.now()

      // First time — allowed
      const firstCheck = await preventWebhookReplay(eventId, timestamp)
      expect(firstCheck).toBe(true)

      // Record as processed
      await recordProcessedEvent(eventId, 'processed')

      // Second time — blocked as duplicate
      const secondCheck = await preventWebhookReplay(eventId, timestamp)
      expect(secondCheck).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 4. Forged Webhook — Rejected
  // ──────────────────────────────────────────────────────────────

  describe('forged webhook rejection', () => {
    it('should reject a webhook with an invalid signature', () => {
      const payload = JSON.stringify({ event: 'charge.completed', data: {} })
      const validSignature = 'a' + 'b'.repeat(63) // Dummy 64-char hex
      const forgedSignature = 'f'.repeat(64) // Different signature

      // The forged signature won't match the computed HMAC
      const result = verifyWebhookSignature(payload, forgedSignature, 'test-secret')

      // Both should be false since they won't match the computed HMAC
      expect(result).toBe(false)
    })

    it('should reject a webhook with missing signature', () => {
      const payload = JSON.stringify({ event: 'charge.completed', data: {} })

      const result = verifyWebhookSignature(payload, '', 'test-secret')
      expect(result).toBe(false)
    })

    it('should reject a webhook with missing secret', () => {
      const payload = JSON.stringify({ event: 'charge.completed', data: {} })

      const result = verifyWebhookSignature(payload, 'some-signature', '')
      expect(result).toBe(false)
    })

    it('should reject a webhook with missing payload', () => {
      const result = verifyWebhookSignature('', 'some-signature', 'test-secret')
      expect(result).toBe(false)
    })

    it('should accept a webhook with a valid signature', async () => {
      const payload = '{"event":"charge.completed","data":{}}'
      const secret = 'test-webhook-secret'

      // Compute the correct HMAC
      const { createHmac } = await import('node:crypto')
      const correctSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const result = verifyWebhookSignature(payload, correctSignature, secret)
      expect(result).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 5. Wrong Amount — Rejected
  // ──────────────────────────────────────────────────────────────

  describe('wrong amount rejection', () => {
    it('should reject when paid amount is less than product price', () => {
      const result = verifyAmount(29.99, 10.00, 'USD')

      expect(result.valid).toBe(false)
      expect(result.discrepancy).toBeCloseTo(19.99, 1)
    })

    it('should reject when paid amount is more than product price', () => {
      const result = verifyAmount(29.99, 50.00, 'USD')

      expect(result.valid).toBe(false)
      expect(result.discrepancy).toBeCloseTo(20.01, 1)
    })

    it('should reject zero payment for non-free product', () => {
      const result = verifyAmount(29.99, 0, 'USD')

      expect(result.valid).toBe(false)
    })

    it('should allow small floating point tolerance for USD', () => {
      // Within 0.01 tolerance for 2-decimal currencies
      const result = verifyAmount(29.99, 29.99001, 'USD')

      expect(result.valid).toBe(true)
    })

    it('should handle zero-decimal currencies with larger tolerance', () => {
      // JPY has 0 decimal places — 1 unit tolerance
      const result1 = verifyAmount(3000, 3001, 'JPY')
      expect(result1.valid).toBe(true)

      const result2 = verifyAmount(3000, 3002, 'JPY')
      expect(result2.valid).toBe(false)
    })

    it('should reject negative amounts', () => {
      const result = verifyAmount(29.99, -10, 'USD')
      expect(result.valid).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 6. Wrong Product — Rejected
  // ──────────────────────────────────────────────────────────────

  describe('wrong product rejection', () => {
    it('should reject when product does not belong to claimed seller', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { seller_id: 'seller-002' }, // Different seller
        error: null,
      })

      const result = await verifyProductOwnership(VALID_PRODUCT_ID, VALID_SELLER_ID)

      expect(result.valid).toBe(false)
      expect(result.actualSellerId).toBe('seller-002')
      expect(result.error).toContain('does not belong')
    })

    it('should accept when product belongs to claimed seller', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { seller_id: VALID_SELLER_ID },
        error: null,
      })

      const result = await verifyProductOwnership(VALID_PRODUCT_ID, VALID_SELLER_ID)

      expect(result.valid).toBe(true)
      expect(result.actualSellerId).toBe(VALID_SELLER_ID)
    })

    it('should reject when product is not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await verifyProductOwnership('nonexistent-product', VALID_SELLER_ID)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Product not found')
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 7. Wrong User — Rejected (Transaction Hijacking)
  // ──────────────────────────────────────────────────────────────

  describe('wrong user rejection (transaction hijacking)', () => {
    it('should reject when transaction belongs to a different user', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { buyer_id: 'user-002' }, // Different user (orders schema)
        error: null,
      })

      const result = await verifyTransactionOwnership(VALID_TX_REF, VALID_USER_ID)

      expect(result.valid).toBe(false)
      expect(result.actualUserId).toBe('user-002')
      expect(result.error).toContain('does not belong')
    })

    it('should accept when transaction belongs to the claiming user', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { buyer_id: VALID_USER_ID },
        error: null,
      })

      const result = await verifyTransactionOwnership(VALID_TX_REF, VALID_USER_ID)

      expect(result.valid).toBe(true)
    })

    it('should reject when transaction is not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      // Also mock v2 table
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await verifyTransactionOwnership('nonexistent-tx', VALID_USER_ID)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Transaction not found')
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 8. Refund Revokes License
  // ──────────────────────────────────────────────────────────────

  describe('refund revokes license', () => {
    it('should revoke license when refund is processed', async () => {
      // Mock order lookup (live schema: payment state on orders)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'purchase-001',
          buyer_id: VALID_USER_ID,
          seller_id: VALID_SELLER_ID,
          status: 'completed',
          total_amount: VALID_AMOUNT,
          currency: VALID_CURRENCY,
          flutterwave_flw_ref: VALID_FLW_REF,
          flutterwave_tx_ref: VALID_TX_REF,
        },
        error: null,
      })

      // Mock order item lookup (product)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { product_id: VALID_PRODUCT_ID },
        error: null,
      })

      // Mock Flutterwave refund API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 'refund-001' },
        }),
      })

      // Mock purchase update
      mockSupabase.eq.mockReturnThis()

      // Mock license lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'license-001' },
        error: null,
      })

      // Mock license revocation
      mockSupabase.eq.mockReturnThis()

      const result = await handleRefund('purchase-001', 'Product not as described')

      expect(result.success).toBe(true)
      expect(result.refundId).toBe('refund-001')
      expect(result.licenseRevoked).toBe(true)
    })

    it('should reject refund for non-completed purchase', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'purchase-002',
          status: 'pending', // Not completed
        },
        error: null,
      })

      const result = await handleRefund('purchase-002', 'Change of mind')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only completed purchases')
    })

    it('should reject refund for non-existent purchase', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await handleRefund('nonexistent-purchase', 'Reason')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Purchase not found')
    })
  })

  // ──────────────────────────────────────────────────────────────
  // 9. Replay Attack Prevention
  // ──────────────────────────────────────────────────────────────

  describe('replay attack prevention', () => {
    it('should reject events older than 5 minutes', async () => {
      const eventId = 'charge.completed:EF-replay:111'
      const staleTimestamp = Date.now() - (6 * 60 * 1000) // 6 minutes ago

      const result = await preventWebhookReplay(eventId, staleTimestamp)

      expect(result).toBe(false)
    })

    it('should accept events within 5 minute window', async () => {
      const eventId = 'charge.completed:EF-fresh:222'
      const freshTimestamp = Date.now() - (3 * 60 * 1000) // 3 minutes ago

      const result = await preventWebhookReplay(eventId, freshTimestamp)

      expect(result).toBe(true)
    })

    it('should accept events with current timestamp', async () => {
      const eventId = 'charge.completed:EF-current:333'
      const currentTimestamp = Date.now()

      const result = await preventWebhookReplay(eventId, currentTimestamp)

      expect(result).toBe(true)
    })

    it('should reject future-dated events more than 1 minute ahead', async () => {
      const eventId = 'charge.completed:EF-future:444'
      const futureTimestamp = Date.now() + (2 * 60 * 1000) // 2 minutes in future

      const result = await preventWebhookReplay(eventId, futureTimestamp)

      expect(result).toBe(false)
    })

    it('should reject events with invalid timestamps', async () => {
      const eventId = 'charge.completed:EF-invalid:555'

      const result = await preventWebhookReplay(eventId, 'not-a-date')

      expect(result).toBe(false)
    })

    it('should reject events with missing event ID', async () => {
      const result = await preventWebhookReplay('', Date.now())

      expect(result).toBe(false)
    })

    it('should prevent the same event from being processed twice', async () => {
      const eventId = 'charge.completed:EF-dedup:666'
      const timestamp = Date.now()

      // First time — allowed
      expect(await preventWebhookReplay(eventId, timestamp)).toBe(true)

      // Record as processed
      await recordProcessedEvent(eventId, 'processed')

      // Second time — blocked
      expect(await preventWebhookReplay(eventId, timestamp)).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // Webhook Payload Validation
  // ──────────────────────────────────────────────────────────────

  describe('webhook payload validation', () => {
    it('should validate a correct Flutterwave webhook payload', () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          tx_ref: VALID_TX_REF,
          flw_ref: VALID_FLW_REF,
          status: 'successful',
          amount: VALID_AMOUNT,
          currency: VALID_CURRENCY,
          customer: {
            email: 'buyer@example.com',
            name: 'Test Buyer',
          },
        },
      }

      const result = validateWebhookPayload(payload)

      expect(result).not.toBeNull()
      expect(result?.event).toBe('charge.completed')
      expect(result?.data.tx_ref).toBe(VALID_TX_REF)
      expect(result?.data.status).toBe('successful')
    })

    it('should reject a payload with invalid event type', () => {
      const payload = {
        event: 'invalid.event',
        data: {
          id: 12345,
          tx_ref: VALID_TX_REF,
          flw_ref: VALID_FLW_REF,
          status: 'successful',
          amount: VALID_AMOUNT,
          currency: VALID_CURRENCY,
          customer: {},
        },
      }

      const result = validateWebhookPayload(payload)

      expect(result).toBeNull()
    })

    it('should reject a payload with missing required fields', () => {
      const payload = {
        event: 'charge.completed',
        data: {
          // Missing tx_ref, flw_ref, etc.
          id: 12345,
        },
      }

      const result = validateWebhookPayload(payload)

      expect(result).toBeNull()
    })

    it('should reject a payload with negative amount', () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          tx_ref: VALID_TX_REF,
          flw_ref: VALID_FLW_REF,
          status: 'successful',
          amount: -100, // Negative
          currency: VALID_CURRENCY,
          customer: {},
        },
      }

      const result = validateWebhookPayload(payload)

      expect(result).toBeNull()
    })

    it('should reject a payload with invalid currency length', () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          tx_ref: VALID_TX_REF,
          flw_ref: VALID_FLW_REF,
          status: 'successful',
          amount: 100,
          currency: 'US', // Should be 3 chars
          customer: {},
        },
      }

      const result = validateWebhookPayload(payload)

      expect(result).toBeNull()
    })

    it('should reject null payload', () => {
      const result = validateWebhookPayload(null)
      expect(result).toBeNull()
    })

    it('should reject undefined payload', () => {
      const result = validateWebhookPayload(undefined)
      expect(result).toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────────
  // Integration: Full Secure Payment Flow
  // ──────────────────────────────────────────────────────────────

  describe('full secure payment flow (integration)', () => {
    it('should complete a full payment verification flow', async () => {
      // Step 1: Verify payment with provider
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => VALID_FLUTTERWAVE_RESPONSE,
      })

      const providerResult = await verifyPaymentWithProvider(VALID_TX_REF)
      expect(providerResult.success).toBe(true)
      expect(providerResult.status).toBe('successful')

      // Step 2: Verify amount
      const amountResult = verifyAmount(
        VALID_AMOUNT,
        providerResult.amount,
        providerResult.currency
      )
      expect(amountResult.valid).toBe(true)

      // Step 3: Verify transaction ownership
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { buyer_id: VALID_USER_ID },
        error: null,
      })

      const ownershipResult = await verifyTransactionOwnership(VALID_TX_REF, VALID_USER_ID)
      expect(ownershipResult.valid).toBe(true)

      // All checks pass — purchase can be marked as completed
    })

    it('should fail the flow if provider verification fails', async () => {
      // Provider returns failed payment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            ...VALID_FLUTTERWAVE_RESPONSE.data,
            status: 'failed',
          },
        }),
      })

      const providerResult = await verifyPaymentWithProvider(VALID_TX_REF)
      expect(providerResult.success).toBe(false)

      // Should NOT proceed to amount verification or license generation
    })

    it('should fail the flow if amount does not match', async () => {
      // Provider says successful but with different amount
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            ...VALID_FLUTTERWAVE_RESPONSE.data,
            amount: 9.99, // Much less than expected 29.99
          },
        }),
      })

      const providerResult = await verifyPaymentWithProvider(VALID_TX_REF)
      expect(providerResult.success).toBe(true)

      const amountResult = verifyAmount(
        VALID_AMOUNT, // Expected 29.99
        providerResult.amount, // Got 9.99
        providerResult.currency
      )
      expect(amountResult.valid).toBe(false)

      // Should NOT proceed to license generation
    })
  })
})
