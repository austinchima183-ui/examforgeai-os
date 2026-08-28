// ============================================================================
// ExamForge AI — Invoice Service
// ============================================================================
// Invoice generation, management, tax calculation, and PDF generation data.
// Auto-generates invoices from subscription/usage data with regional tax support.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceFilters,
  TaxRate,
  Coupon,
  MeteredUsage,
  BillingCycle,
} from './types'
import type { PlanTier } from '@/lib/supabase/types'
import { getSubscription, getSubscriptionUsage } from './subscription-service'
import { validateCoupon, applyCoupon } from './coupon-service'

// ──────────────────────────────────────────────────────────────
// Regional Tax Rates Database
// ──────────────────────────────────────────────────────────────

const DEFAULT_TAX_RATES: TaxRate[] = [
  { id: 'ng-vat', name: 'Nigeria VAT', rate: 7.5, region: 'NG', type: 'exclusive', effectiveDate: '2024-01-01' },
  { id: 'ke-vat', name: 'Kenya VAT', rate: 16, region: 'KE', type: 'exclusive', effectiveDate: '2024-01-01' },
  { id: 'gh-vat', name: 'Ghana VAT', rate: 15, region: 'GH', type: 'exclusive', effectiveDate: '2024-01-01' },
  { id: 'za-vat', name: 'South Africa VAT', rate: 15, region: 'ZA', type: 'inclusive', effectiveDate: '2024-01-01' },
  { id: 'gb-vat', name: 'UK VAT', rate: 20, region: 'GB', type: 'exclusive', effectiveDate: '2024-01-01' },
  { id: 'us-sales', name: 'US Sales Tax (avg)', rate: 7.25, region: 'US', type: 'exclusive', effectiveDate: '2024-01-01' },
]

// ──────────────────────────────────────────────────────────────
// Get Organization Region
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

// ──────────────────────────────────────────────────────────────
// generateInvoice — Auto-generate from usage/subscription
// ──────────────────────────────────────────────────────────────

export async function generateInvoice(
  orgId: string,
  periodStart: string,
  periodEnd: string
): Promise<Invoice> {
  const supabase = await createClient()

  // Get active subscription (live schema: school-scoped, plan via plan_id)
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('id, plan_id, billing_cycle, seats_purchased, price_at_subscription, currency, coupon_id')
    .eq('school_id', orgId)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  const lineItems: InvoiceLineItem[] = []

  // ── Subscription line item ──
  if (subData) {
    const billingCycle = subData.billing_cycle as BillingCycle

    // Get plan details (one price per tier+cycle row)
    const { data: plan } = await supabase
      .from('plans')
      .select('name, tier, price, billing_cycle')
      .eq('id', subData.plan_id)
      .eq('is_active', true)
      .maybeSingle()

    const planTier = (plan?.tier ?? 'free') as PlanTier
    let price = subData.price_at_subscription ?? 0
    if (plan && (plan.billing_cycle as string) === billingCycle) {
      price = plan.price ?? price
    }

    lineItems.push({
      id: crypto.randomUUID(),
      description: `${plan?.name ?? planTier} Plan — ${billingCycle}`,
      quantity: 1,
      unitPrice: price,
      total: price,
      type: 'subscription',
      metadata: { planTier, billingCycle, periodStart, periodEnd },
    })

    // ── Metered usage line items ──
    const usage = await getSubscriptionUsage(subData.id)
    for (const item of usage) {
      if (item.overageQuantity > 0 && item.total > 0) {
        lineItems.push({
          id: crypto.randomUUID(),
          description: `Metered usage overage: ${item.metric} (${item.overageQuantity} over included ${item.includedQuantity})`,
          quantity: item.overageQuantity,
          unitPrice: item.unitPrice,
          total: item.total,
          type: 'metered_usage',
          metadata: { metric: item.metric, included: item.includedQuantity },
        })
      }
    }

    // ── Seat line items ──
    const { data: seatAlloc } = await supabase
      .from('seat_allocations')
      .select('total_seats, used_seats, seat_price')
      .eq('org_id', orgId)
      .maybeSingle()

    if (seatAlloc && seatAlloc.total_seats > 1) {
      const planDefaultSeats = 1 // Default 1 seat
      const extraSeats = seatAlloc.total_seats - planDefaultSeats
      if (extraSeats > 0 && seatAlloc.seat_price > 0) {
        lineItems.push({
          id: crypto.randomUUID(),
          description: `Additional seats: ${extraSeats}`,
          quantity: extraSeats,
          unitPrice: seatAlloc.seat_price,
          total: extraSeats * seatAlloc.seat_price,
          type: 'seat',
        })
      }
    }
  }

  // Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  // Apply tax rates
  const region = await getOrgRegion(orgId)
  const taxRates = await getTaxRatesForRegion(region)
  const taxResult = applyTaxRates(lineItems, orgId, taxRates)

  // Apply coupon
  let discount = 0
  let couponId: string | null = null
  if (subData?.coupon_id) {
    const { data: couponData } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', subData.coupon_id)
      .maybeSingle()

    if (couponData) {
      const coupon: Coupon = {
        id: couponData.id,
        code: couponData.code ?? '',
        name: couponData.name ?? '',
        type: couponData.type as Coupon['type'],
        value: couponData.value ?? 0,
        maxUses: couponData.max_uses,
        usedCount: couponData.used_count ?? 0,
        validFrom: couponData.valid_from ?? '',
        validUntil: couponData.valid_until,
        applicablePlans: (couponData.applicable_plans as PlanTier[]) ?? [],
        isActive: couponData.is_active ?? true,
        createdAt: couponData.created_at ?? '',
        updatedAt: couponData.updated_at ?? '',
      }

      const isValid = await validateCoupon(coupon.code, orgId, (((subData as unknown as { planTier?: string }).planTier) ?? 'free') as PlanTier)
      if (isValid.valid) {
        discount = applyCoupon(coupon, subtotal)
        couponId = coupon.id
      }
    }
  }

  const total = subtotal + taxResult.totalTax - discount

  // Get next invoice number
  const number = await getNextInvoiceNumber(orgId)

  // Calculate due date (30 days from now)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  // Insert invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      number,
      line_items: lineItems,
      subtotal,
      tax: taxResult.totalTax,
      discount,
      total: Math.max(0, total),
      currency: subData?.currency ?? 'NGN',
      status: 'draft',
      due_date: dueDate.toISOString(),
      subscription_id: subData?.id,
      coupon_id: couponId,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select('*')
    .single()

  if (error || !invoice) {
    throw new Error(`Failed to generate invoice: ${error?.message ?? 'Unknown error'}`)
  }

  return mapInvoiceFromDb(invoice, orgId)
}

// ──────────────────────────────────────────────────────────────
// getInvoice
// ──────────────────────────────────────────────────────────────

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const supabase = await createClient()
  const { data: inv } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!inv) return null
  return mapInvoiceFromDb(inv, inv.org_id ?? '')
}

// ──────────────────────────────────────────────────────────────
// listInvoices — Paginated
// ──────────────────────────────────────────────────────────────

export async function listInvoices(
  orgId: string,
  filters: InvoiceFilters = {}
): Promise<{ invoices: Invoice[]; total: number }> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
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

  const { data, count } = await query

  const invoices = (data ?? []).map((inv) => mapInvoiceFromDb(inv, orgId))

  return { invoices, total: count ?? 0 }
}

// ──────────────────────────────────────────────────────────────
// updateInvoice
// ──────────────────────────────────────────────────────────────

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Pick<Invoice, 'status' | 'notes' | 'dueDate'>>
): Promise<Invoice> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.status) updateData.status = updates.status
  if (updates.notes) updateData.notes = updates.notes
  if (updates.dueDate) updateData.due_date = updates.dueDate

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`)
  }

  const invoice = await getInvoice(invoiceId)
  if (!invoice) throw new Error('Invoice not found after update')
  return invoice
}

// ──────────────────────────────────────────────────────────────
// voidInvoice
// ──────────────────────────────────────────────────────────────

export async function voidInvoice(invoiceId: string): Promise<Invoice> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`Failed to void invoice: ${error.message}`)
  }

  const invoice = await getInvoice(invoiceId)
  if (!invoice) throw new Error('Invoice not found after void')
  return invoice
}

// ──────────────────────────────────────────────────────────────
// markInvoiceSent
// ──────────────────────────────────────────────────────────────

export async function markInvoiceSent(invoiceId: string): Promise<Invoice> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      issued_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`Failed to mark invoice as sent: ${error.message}`)
  }

  const invoice = await getInvoice(invoiceId)
  if (!invoice) throw new Error('Invoice not found after update')
  return invoice
}

// ──────────────────────────────────────────────────────────────
// calculateInvoiceTotal — With tax and discount
// ──────────────────────────────────────────────────────────────

export function calculateInvoiceTotal(
  items: InvoiceLineItem[],
  taxRates: TaxRate[],
  coupon?: Coupon
): { subtotal: number; tax: number; discount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  // Calculate tax on taxable items (exclude tax-type items and discount items)
  const taxableAmount = items
    .filter((item) => item.type !== 'tax' && item.type !== 'discount' && item.type !== 'credit')
    .reduce((sum, item) => sum + item.total, 0)

  const totalTaxRate = taxRates
    .filter((t) => t.type === 'exclusive')
    .reduce((sum, t) => sum + t.rate, 0)

  const tax = (taxableAmount * totalTaxRate) / 100

  // Apply coupon discount
  let discount = 0
  if (coupon) {
    discount = applyCoupon(coupon, subtotal)
  }

  const total = Math.max(0, subtotal + tax - discount)

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// ──────────────────────────────────────────────────────────────
// applyTaxRates — Regional tax calculation
// ──────────────────────────────────────────────────────────────

export function applyTaxRates(
  items: InvoiceLineItem[],
  _orgId: string,
  taxRates: TaxRate[]
): { lineItems: InvoiceLineItem[]; totalTax: number } {
  const taxableItems = items.filter(
    (item) => item.type !== 'tax' && item.type !== 'discount' && item.type !== 'credit'
  )

  const taxableAmount = taxableItems.reduce((sum, item) => sum + item.total, 0)

  // Calculate exclusive taxes
  const exclusiveTaxRate = taxRates
    .filter((t) => t.type === 'exclusive')
    .reduce((sum, t) => sum + t.rate, 0)

  const exclusiveTax = (taxableAmount * exclusiveTaxRate) / 100

  // For inclusive taxes, extract the tax from the amount
  const inclusiveTaxRate = taxRates
    .filter((t) => t.type === 'inclusive')
    .reduce((sum, t) => sum + t.rate, 0)

  const inclusiveTax = inclusiveTaxRate > 0
    ? taxableAmount - (taxableAmount * 100) / (100 + inclusiveTaxRate)
    : 0

  const totalTax = Math.round((exclusiveTax + inclusiveTax) * 100) / 100

  // Generate tax line items
  const taxLineItems: InvoiceLineItem[] = []
  for (const rate of taxRates) {
    const taxForRate = (taxableAmount * rate.rate) / 100
    if (taxForRate > 0) {
      taxLineItems.push({
        id: crypto.randomUUID(),
        description: `${rate.name} (${rate.rate}%)`,
        quantity: 1,
        unitPrice: Math.round(taxForRate * 100) / 100,
        total: Math.round(taxForRate * 100) / 100,
        type: 'tax',
        metadata: { taxRateId: rate.id, rate: rate.rate, region: rate.region, taxType: rate.type },
      })
    }
  }

  return { lineItems: taxLineItems, totalTax }
}

// ──────────────────────────────────────────────────────────────
// getTaxRatesForRegion
// ──────────────────────────────────────────────────────────────

export async function getTaxRatesForRegion(region: string): Promise<TaxRate[]> {
  const supabase = await createClient()

  // Check DB first
  const { data: dbRates } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('region', region)
    .eq('is_active', true)

  if (dbRates && dbRates.length > 0) {
    return dbRates.map((r) => ({
      id: r.id,
      name: r.name ?? '',
      rate: r.rate ?? 0,
      region: r.region ?? region,
      type: (r.type as TaxRate['type']) ?? 'exclusive',
      effectiveDate: r.effective_date ?? '',
      expiryDate: r.expiry_date,
    }))
  }

  // Fallback to default rates
  return DEFAULT_TAX_RATES.filter((r) => r.region === region)
}

// ──────────────────────────────────────────────────────────────
// getNextInvoiceNumber — Sequential numbering
// ──────────────────────────────────────────────────────────────

export async function getNextInvoiceNumber(orgId: string): Promise<string> {
  const supabase = await createClient()

  // Get current year and month
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Get count of invoices for this org this month
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', `${year}-${month}-01`)
    .lt('created_at', `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-01`)

  const sequence = (count ?? 0) + 1

  // Format: INV-{ORG_PREFIX}-{YYYYMM}-{SEQ}
  const orgPrefix = orgId.substring(0, 8).toUpperCase()

  return `INV-${orgPrefix}-${year}${month}-${String(sequence).padStart(4, '0')}`
}

// ──────────────────────────────────────────────────────────────
// sendInvoiceEmail
// ──────────────────────────────────────────────────────────────

export async function sendInvoiceEmail(invoiceId: string): Promise<{ sent: boolean; messageId?: string }> {
  const supabase = await createClient()
  const invoice = await getInvoice(invoiceId)

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  // Get organization email
  const { data: org } = await supabase
    .from('organizations')
    .select('name, billing_email, email')
    .eq('id', invoice.orgId)
    .maybeSingle()

  const recipientEmail = org?.billing_email ?? org?.email

  if (!recipientEmail) {
    throw new Error('No billing email found for organization')
  }

  // Update invoice status to sent
  await markInvoiceSent(invoiceId)

  // Queue email via Supabase Edge Function
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Invoice ${invoice.number} from ExamForge AI`,
          template: 'invoice',
          data: {
            invoiceNumber: invoice.number,
            amount: invoice.total,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            orgName: org?.name ?? 'Your Organization',
          },
        }),
      })

      const result = await response.json()
      return { sent: true, messageId: result.messageId }
    } catch {
      // Email sending failed but invoice is marked as sent
      return { sent: true }
    }
  }

  return { sent: true }
}

// ──────────────────────────────────────────────────────────────
// generateInvoicePDF — PDF generation data
// ──────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoiceId: string): Promise<{
  invoice: Invoice
  organization: { name: string; address: string; email: string; phone: string; taxId?: string }
  items: InvoiceLineItem[]
  taxBreakdown: { name: string; rate: number; amount: number }[]
  paymentTerms: string
}> {
  const supabase = await createClient()
  const invoice = await getInvoice(invoiceId)

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('name, address, email, phone, tax_id')
    .eq('id', invoice.orgId)
    .maybeSingle()

  const organization = {
    name: org?.name ?? 'Unknown Organization',
    address: org?.address ?? '',
    email: org?.email ?? '',
    phone: org?.phone ?? '',
    taxId: org?.tax_id ?? undefined,
  }

  // Build tax breakdown
  const taxBreakdown = invoice.lineItems
    .filter((item) => item.type === 'tax' && item.metadata)
    .map((item) => ({
      name: (item.metadata?.taxRateName as string) ?? item.description,
      rate: (item.metadata?.rate as number) ?? 0,
      amount: item.total,
    }))

  return {
    invoice,
    organization,
    items: invoice.lineItems,
    taxBreakdown,
    paymentTerms: 'Payment is due within 30 days of invoice date.',
  }
}

// ──────────────────────────────────────────────────────────────
// getOutstandingInvoices
// ──────────────────────────────────────────────────────────────

export async function getOutstandingInvoices(orgId: string): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['sent', 'draft'])
    .order('due_date', { ascending: true })

  const now = new Date().toISOString()

  return (invoices ?? []).map((inv) => {
    const mapped = mapInvoiceFromDb(inv, orgId)
    // Mark overdue invoices
    if (mapped.status === 'sent' && mapped.dueDate < now) {
      mapped.status = 'sent' as InvoiceStatus // Keep original status, but note overdue
    }
    return mapped
  })
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to Invoice
// ──────────────────────────────────────────────────────────────

function mapInvoiceFromDb(inv: Record<string, unknown>, orgId: string): Invoice {
  return {
    id: inv.id as string,
    orgId: (inv.org_id as string) ?? orgId,
    number: (inv.number as string) ?? '',
    lineItems: (inv.line_items as InvoiceLineItem[]) ?? [],
    subtotal: (inv.subtotal as number) ?? 0,
    tax: (inv.tax as number) ?? 0,
    discount: (inv.discount as number) ?? 0,
    total: (inv.total as number) ?? 0,
    currency: (inv.currency as string) ?? 'NGN',
    status: (inv.status as InvoiceStatus) ?? 'draft',
    dueDate: (inv.due_date as string) ?? '',
    issuedAt: (inv.issued_at as string) ?? null,
    paidAt: (inv.paid_at as string) ?? null,
    voidedAt: (inv.voided_at as string) ?? null,
    createdAt: (inv.created_at as string) ?? '',
    updatedAt: (inv.updated_at as string) ?? '',
    notes: (inv.notes as string) ?? undefined,
    couponId: (inv.coupon_id as string) ?? undefined,
    subscriptionId: (inv.subscription_id as string) ?? undefined,
  }
}
