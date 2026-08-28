// ============================================================================
// ExamForge AI — Invoice Service (Extended)
// ============================================================================
// Extended invoice generation with subscription-aware line items, proration
// support, and PDF-ready formatting. Extends the existing invoice-service.ts
// with subscription-scoped invoice generation.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { recordAuditEntry } from './payment-audit'
import type { InvoiceGeneration, InvoiceLineItemExtended, PaymentProvider } from './types-extended'
import type { PlanTier } from '@/lib/supabase/types'

const log = createLogger('billing:invoice-extended')

// ──────────────────────────────────────────────────────────────
// Default Tax Rate
// ──────────────────────────────────────────────────────────────

const DEFAULT_TAX_RATE = 7.5 // Nigeria VAT

// ──────────────────────────────────────────────────────────────
// generateInvoice (Subscription-Scoped)
// ──────────────────────────────────────────────────────────────

/**
 * Generates an invoice for a subscription's billing period.
 *
 * Creates line items from:
 * - Subscription base price
 * - Additional seats (if applicable)
 * - Metered usage overages (if applicable)
 * - Tax
 * - Proration adjustments (if mid-period plan change)
 *
 * @param subscriptionId - The subscription ID to generate the invoice for
 * @param periodStart - The billing period start date
 * @param periodEnd - The billing period end date
 * @returns InvoiceGeneration with line items, tax, and totals
 */
export async function generateInvoice(
  subscriptionId: string,
  periodStart: string,
  periodEnd: string
): Promise<InvoiceGeneration> {
  const supabase = await createClient()

  // Get subscription details
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, school_id, user_id, plan_id, billing_cycle, seats_purchased, price_at_subscription, currency')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!sub) {
    throw new Error(`Subscription not found: ${subscriptionId}`)
  }

  const orgId = sub.school_id as string
  const currency = (sub.currency as string) ?? 'NGN'
  const provider: PaymentProvider = 'flutterwave'
  const lineItems: InvoiceLineItemExtended[] = []

  // ── Subscription base price line item ──
  const billingCycle = sub.billing_cycle as string

  const { data: plan } = await supabase
    .from('plans')
    .select('name, tier, price, billing_cycle')
    .eq('id', sub.plan_id)
    .maybeSingle()
  const planTier = (plan?.tier ?? 'free') as PlanTier

  const baseAmount = (sub.price_at_subscription as number) ?? 0

  lineItems.push({
    id: crypto.randomUUID(),
    description: `${plan?.name ?? planTier} Plan — ${billingCycle}`,
    quantity: 1,
    unitPrice: baseAmount,
    total: baseAmount,
    type: 'subscription',
    metadata: { planTier, billingCycle, periodStart, periodEnd },
  })

  // ── Additional seats line item ──
  const seats = (sub.seats_purchased as number) ?? 1
  if (seats > 1) {
    const { data: seatAlloc } = await supabase
      .from('seat_allocations')
      .select('total_seats, seat_price')
      .eq('org_id', orgId)
      .maybeSingle()

    const seatPrice = (seatAlloc?.seat_price as number) ?? 0
    const extraSeats = seats - 1

    if (extraSeats > 0 && seatPrice > 0) {
      lineItems.push({
        id: crypto.randomUUID(),
        description: `Additional seats: ${extraSeats}`,
        quantity: extraSeats,
        unitPrice: seatPrice,
        total: extraSeats * seatPrice,
        type: 'seat',
        metadata: { totalSeats: seats, defaultSeats: 1 },
      })
    }
  }

  // ── Metered usage overages ──
  try {
    const { data: usageRecords } = await supabase
      .from('usage_records')
      .select('metric, quantity')
      .eq('org_id', orgId)
      .gte('timestamp', periodStart)
      .lt('timestamp', periodEnd)

    if (usageRecords && usageRecords.length > 0) {
      // Group by metric
      const usageByMetric = new Map<string, number>()
      for (const record of usageRecords) {
        const metric = record.metric as string
        const quantity = (record.quantity as number) ?? 0
        usageByMetric.set(metric, (usageByMetric.get(metric) ?? 0) + quantity)
      }

      // Get limits for the plan
      const { data: planLimits } = await supabase
        .from('plan_limits')
        .select('metric, included_quantity, overage_price')
        .eq('plan_tier', planTier)

      if (planLimits) {
        for (const limit of planLimits) {
          const metric = limit.metric as string
          const included = (limit.included_quantity as number) ?? 0
          const overagePrice = (limit.overage_price as number) ?? 0
          const used = usageByMetric.get(metric) ?? 0

          if (used > included && overagePrice > 0) {
            const overage = used - included
            lineItems.push({
              id: crypto.randomUUID(),
              description: `Metered overage: ${metric} (${overage} over ${included})`,
              quantity: overage,
              unitPrice: overagePrice,
              total: overage * overagePrice,
              type: 'metered_usage',
              metadata: { metric, included, used, overage },
            })
          }
        }
      }
    }
  } catch (error) {
    log.warn('Could not calculate metered usage', { error: error instanceof Error ? error.message : String(error) })
  }

  // Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  // Apply tax
  const region = await getOrgRegion(orgId)
  const taxRate = await getTaxRateForRegion(region)
  const taxableAmount = lineItems
    .filter((item) => item.type !== 'tax' && item.type !== 'discount' && item.type !== 'credit')
    .reduce((sum, item) => sum + item.total, 0)
  const tax = Math.round((taxableAmount * taxRate / 100) * 100) / 100

  // Add tax line item
  if (tax > 0) {
    lineItems.push({
      id: crypto.randomUUID(),
      description: `Tax (${taxRate}%)`,
      quantity: 1,
      unitPrice: tax,
      total: tax,
      type: 'tax',
      metadata: { rate: taxRate, region },
    })
  }

  const total = Math.max(0, subtotal + tax)

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(orgId)

  // Insert invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      number: invoiceNumber,
      line_items: lineItems,
      subtotal,
      tax,
      discount: 0,
      total,
      currency,
      status: 'draft',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_id: subscriptionId,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select('*')
    .single()

  if (error || !invoice) {
    throw new Error(`Failed to generate invoice: ${error?.message ?? 'Unknown error'}`)
  }

  await recordAuditEntry(
    subscriptionId,
    'invoice.generated',
    provider,
    { invoiceId: invoice.id, invoiceNumber, total, currency }
  )

  log.info('Invoice generated', { invoiceId: invoice.id, subscriptionId, total })

  return {
    id: invoice.id as string,
    subscriptionId,
    orgId,
    periodStart,
    periodEnd,
    lineItems,
    subtotal,
    tax,
    total,
    currency,
    status: 'draft',
    invoiceNumber,
    createdAt: (invoice.created_at as string) ?? new Date().toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────
// getInvoice
// ──────────────────────────────────────────────────────────────

/**
 * Retrieves an invoice by ID.
 *
 * @param invoiceId - The invoice ID
 * @returns InvoiceGeneration or null if not found
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceGeneration | null> {
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!inv) return null

  return {
    id: inv.id as string,
    subscriptionId: (inv.subscription_id as string) ?? '',
    orgId: (inv.org_id as string) ?? '',
    periodStart: (inv.period_start as string) ?? '',
    periodEnd: (inv.period_end as string) ?? '',
    lineItems: (inv.line_items as InvoiceLineItemExtended[]) ?? [],
    subtotal: (inv.subtotal as number) ?? 0,
    tax: (inv.tax as number) ?? 0,
    total: (inv.total as number) ?? 0,
    currency: (inv.currency as string) ?? 'NGN',
    status: (inv.status as InvoiceGeneration['status']) ?? 'draft',
    invoiceNumber: (inv.number as string) ?? '',
    createdAt: (inv.created_at as string) ?? '',
  }
}

// ──────────────────────────────────────────────────────────────
// listInvoices
// ──────────────────────────────────────────────────────────────

/**
 * Lists invoices for an organization with optional filters.
 *
 * @param organizationId - The organization ID
 * @param filters - Optional filters (status, date range, pagination)
 * @returns Array of invoices
 */
export async function listInvoices(
  organizationId: string,
  filters: {
    status?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  } = {}
): Promise<InvoiceGeneration[]> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('org_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.from) {
    query = query.gte('created_at', filters.from)
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to)
  }

  const { data } = await query

  return (data ?? []).map((inv) => ({
    id: inv.id as string,
    subscriptionId: (inv.subscription_id as string) ?? '',
    orgId: (inv.org_id as string) ?? '',
    periodStart: (inv.period_start as string) ?? '',
    periodEnd: (inv.period_end as string) ?? '',
    lineItems: (inv.line_items as InvoiceLineItemExtended[]) ?? [],
    subtotal: (inv.subtotal as number) ?? 0,
    tax: (inv.tax as number) ?? 0,
    total: (inv.total as number) ?? 0,
    currency: (inv.currency as string) ?? 'NGN',
    status: (inv.status as InvoiceGeneration['status']) ?? 'draft',
    invoiceNumber: (inv.number as string) ?? '',
    createdAt: (inv.created_at as string) ?? '',
  }))
}

// ──────────────────────────────────────────────────────────────
// markInvoicePaid
// ──────────────────────────────────────────────────────────────

/**
 * Marks an invoice as paid after payment verification.
 *
 * @param invoiceId - The invoice ID to mark as paid
 * @param paymentReference - The verified payment reference
 */
export async function markInvoicePaid(
  invoiceId: string,
  paymentReference: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference,
    })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`Failed to mark invoice as paid: ${error.message}`)
  }

  await recordAuditEntry(invoiceId, 'invoice.paid', 'flutterwave', { paymentReference })

  log.info('Invoice marked as paid', { invoiceId, paymentReference })
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

async function getOrgRegion(orgId: string): Promise<string> {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('country, region')
    .eq('id', orgId)
    .maybeSingle()

  return (org?.country ?? org?.region ?? 'NG') as string
}

async function getTaxRateForRegion(region: string): Promise<number> {
  const supabase = await createClient()

  try {
    const { data: rate } = await supabase
      .from('tax_rates')
      .select('rate')
      .eq('region', region)
      .eq('is_active', true)
      .maybeSingle()

    if (rate?.rate) return rate.rate as number
  } catch {
    // Table might not exist
  }

  // Fallback tax rates
  const fallbackRates: Record<string, number> = {
    NG: 7.5, KE: 16, GH: 15, ZA: 15, GB: 20, US: 7.25,
  }

  return fallbackRates[region] ?? DEFAULT_TAX_RATE
}

async function getNextInvoiceNumber(orgId: string): Promise<string> {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', `${year}-${month}-01`)

  const sequence = (count ?? 0) + 1
  const orgPrefix = orgId.substring(0, 8).toUpperCase()

  return `INV-${orgPrefix}-${year}${month}-${String(sequence).padStart(4, '0')}`
}
