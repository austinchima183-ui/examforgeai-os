// ============================================================================
// ExamForge AI — Payment Provider Factory
// ============================================================================
// Factory pattern for creating payment provider adapters. Maps provider names
// to their respective adapter implementations, enabling multi-provider billing.
//
// Currently supports:
// - Flutterwave (existing)
// - Paystack (new)
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type { PaymentVerificationResult, RefundResult } from '@/lib/payment/payment-security'
import {
  verifyPaymentWithProvider,
  initiateFlutterwaveCheckout,
  handleRefund as flutterwaveRefund,
  generateTransactionRef,
} from '@/lib/payment/payment-security'
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  refundPaystackTransaction,
} from './paystack'
import type { PaymentProvider, PaymentProviderAdapter } from '../types-extended'

const log = createLogger('billing:provider-factory')

// ──────────────────────────────────────────────────────────────
// Flutterwave Adapter
// ──────────────────────────────────────────────────────────────

const flutterwaveAdapter: PaymentProviderAdapter = {
  async initialize(params) {
    try {
      const result = await initiateFlutterwaveCheckout({
        productId: params.metadata?.productId as string ?? '',
        productTitle: params.metadata?.productTitle as string ?? 'ExamForge Subscription',
        amount: params.amount,
        currency: params.currency,
        userId: params.metadata?.userId as string ?? '',
        userEmail: params.email,
        userName: params.metadata?.userName as string ?? params.email,
        redirectUrl: params.metadata?.redirectUrl as string ?? '',
      })

      return {
        success: result.success,
        checkoutUrl: result.checkoutUrl,
        reference: result.transactionRef,
        error: result.error,
      }
    } catch (error) {
      log.error('Flutterwave adapter initialize error', error)
      return { success: false, error: 'Failed to initialize Flutterwave checkout' }
    }
  },

  async verify(reference: string): Promise<PaymentVerificationResult> {
    return verifyPaymentWithProvider(reference, 'flutterwave')
  },

  async refund(reference: string, _amount?: number): Promise<RefundResult> {
    // Flutterwave refund uses the transaction ID, not the reference
    return flutterwaveRefund(reference, 'Refund via provider factory')
  },

  getWebhookSecret(): string {
    return process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? ''
  },
}

// ──────────────────────────────────────────────────────────────
// Paystack Adapter
// ──────────────────────────────────────────────────────────────

const paystackAdapter: PaymentProviderAdapter = {
  async initialize(params) {
    const reference = params.reference ?? generateTransactionRef()
    const result = await initializePaystackTransaction(
      params.email,
      params.amount,
      params.currency,
      reference,
      params.metadata
    )

    return {
      success: result.success,
      checkoutUrl: result.authorizationUrl,
      reference: result.reference ?? reference,
      error: result.error,
    }
  },

  async verify(reference: string): Promise<PaymentVerificationResult> {
    return verifyPaystackTransaction(reference)
  },

  async refund(reference: string, amount?: number): Promise<RefundResult> {
    return refundPaystackTransaction(reference, amount)
  },

  getWebhookSecret(): string {
    return process.env.PAYSTACK_WEBHOOK_SECRET ?? ''
  },
}

// ──────────────────────────────────────────────────────────────
// Provider Registry
// ──────────────────────────────────────────────────────────────

const providerRegistry: Record<PaymentProvider, PaymentProviderAdapter> = {
  flutterwave: flutterwaveAdapter,
  paystack: paystackAdapter,
}

// ──────────────────────────────────────────────────────────────
// createPaymentProvider
// ──────────────────────────────────────────────────────────────

/**
 * Creates a payment provider adapter for the specified provider.
 *
 * @param provider - The payment provider name ('flutterwave' | 'paystack')
 * @returns PaymentProviderAdapter with initialize, verify, refund, and getWebhookSecret
 * @throws Error if the provider is not supported
 */
export function createPaymentProvider(provider: PaymentProvider): PaymentProviderAdapter {
  const adapter = providerRegistry[provider]

  if (!adapter) {
    const error = `Unsupported payment provider: ${provider}`
    log.error(error)
    throw new Error(error)
  }

  log.info('Payment provider created', { provider })
  return adapter
}

// ──────────────────────────────────────────────────────────────
// getSupportedProviders
// ──────────────────────────────────────────────────────────────

/**
 * Returns the list of supported payment providers.
 */
export function getSupportedProviders(): PaymentProvider[] {
  return Object.keys(providerRegistry) as PaymentProvider[]
}
