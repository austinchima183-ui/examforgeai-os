// ============================================================================
// ExamForge AI — Coupon Management Service
// ============================================================================
// Coupon creation, validation, application, and usage tracking.
// Supports percentage, fixed amount, and free trial coupon types.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  Coupon,
  CouponType,
  CreateCouponInput,
} from './types'
import type { PlanTier } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// createCoupon
// ──────────────────────────────────────────────────────────────

export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const supabase = await createClient()

  // Check for duplicate code
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('code', input.code)
    .maybeSingle()

  if (existing) {
    throw new Error(`Coupon code already exists: ${input.code}`)
  }

  // Validate coupon value
  if (input.type === 'percentage' && (input.value < 0 || input.value > 100)) {
    throw new Error('Percentage coupon value must be between 0 and 100')
  }

  if (input.type === 'fixed' && input.value < 0) {
    throw new Error('Fixed coupon value must be non-negative')
  }

  if (input.type === 'free_trial' && input.value < 0) {
    throw new Error('Free trial days must be non-negative')
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      code: input.code.toUpperCase(),
      name: input.name,
      type: input.type,
      value: input.value,
      max_uses: input.maxUses ?? null,
      used_count: 0,
      valid_from: input.validFrom,
      valid_until: input.validUntil ?? null,
      applicable_plans: input.applicablePlans,
      applicable_billing_cycles: input.applicableBillingCycles ?? null,
      min_amount: input.minAmount ?? null,
      max_discount: input.maxDiscount ?? null,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !coupon) {
    throw new Error(`Failed to create coupon: ${error?.message ?? 'Unknown error'}`)
  }

  return mapCouponFromDb(coupon)
}

// ──────────────────────────────────────────────────────────────
// getCoupon
// ──────────────────────────────────────────────────────────────

export async function getCoupon(code: string): Promise<Coupon | null> {
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (!coupon) return null
  return mapCouponFromDb(coupon)
}

// ──────────────────────────────────────────────────────────────
// validateCoupon — Check validity, usage limits, applicable plans
// ──────────────────────────────────────────────────────────────

export async function validateCoupon(
  code: string,
  orgId: string,
  planId: PlanTier
): Promise<{
  valid: boolean
  coupon: Coupon | null
  errors: string[]
}> {
  const errors: string[] = []
  const coupon = await getCoupon(code)

  if (!coupon) {
    return { valid: false, coupon: null, errors: ['Coupon not found'] }
  }

  const now = new Date().toISOString()

  // Check active status
  if (!coupon.isActive) {
    errors.push('Coupon is no longer active')
  }

  // Check validity dates
  if (coupon.validFrom > now) {
    errors.push('Coupon is not yet valid')
  }

  if (coupon.validUntil && coupon.validUntil < now) {
    errors.push('Coupon has expired')
  }

  // Check usage limits
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    errors.push('Coupon has reached its maximum usage limit')
  }

  // Check applicable plans
  if (!coupon.applicablePlans.includes(planId)) {
    errors.push(`Coupon is not applicable to the ${planId} plan`)
  }

  // Check org-level usage (prevent same org from using same coupon multiple times)
  const supabase = await createClient()
  const { data: orgUsage } = await supabase
    .from('coupon_usages')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (orgUsage) {
    errors.push('This organization has already used this coupon')
  }

  return {
    valid: errors.length === 0,
    coupon,
    errors,
  }
}

// ──────────────────────────────────────────────────────────────
// applyCoupon — Calculate discount
// ──────────────────────────────────────────────────────────────

export function applyCoupon(coupon: Coupon, amount: number): number {
  switch (coupon.type) {
    case 'percentage': {
      let discount = (amount * coupon.value) / 100
      // Apply max discount cap
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
      return Math.round(discount * 100) / 100
    }

    case 'fixed': {
      const discount = Math.min(coupon.value, amount)
      return Math.round(discount * 100) / 100
    }

    case 'free_trial': {
      // Free trial coupons reduce the amount to 0 for the trial period
      // The value represents the number of free trial days
      return Math.round(amount * 100) / 100
    }

    default:
      return 0
  }
}

// ──────────────────────────────────────────────────────────────
// deactivateCoupon
// ──────────────────────────────────────────────────────────────

export async function deactivateCoupon(couponId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('coupons')
    .update({ is_active: false })
    .eq('id', couponId)

  if (error) {
    throw new Error(`Failed to deactivate coupon: ${error.message}`)
  }
}

// ──────────────────────────────────────────────────────────────
// getCouponUsageStats
// ──────────────────────────────────────────────────────────────

export async function getCouponUsageStats(couponId: string): Promise<{
  coupon: Coupon | null
  totalUses: number
  uniqueOrgs: number
  totalDiscountGiven: number
  recentUsages: {
    orgId: string
    orgName: string
    usedAt: string
    discountAmount: number
  }[]
}> {
  const supabase = await createClient()

  // Get coupon
  const { data: couponData } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .maybeSingle()

  const coupon = couponData ? mapCouponFromDb(couponData) : null

  // Get usage records
  const { data: usages } = await supabase
    .from('coupon_usages')
    .select('org_id, used_at, discount_amount, organizations(name)')
    .eq('coupon_id', couponId)
    .order('used_at', { ascending: false })
    .limit(50)

  const totalUses = usages?.length ?? 0
  const uniqueOrgs = new Set(usages?.map((u) => u.org_id)).size
  const totalDiscountGiven = (usages ?? []).reduce((sum, u) => sum + (u.discount_amount ?? 0), 0)

  const recentUsages = (usages ?? []).map((u) => ({
    orgId: u.org_id ?? '',
    orgName: ((u.organizations as unknown as Record<string, unknown>)?.name as string) ?? 'Unknown',
    usedAt: u.used_at ?? '',
    discountAmount: u.discount_amount ?? 0,
  }))

  return {
    coupon,
    totalUses,
    uniqueOrgs,
    totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
    recentUsages,
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to Coupon
// ──────────────────────────────────────────────────────────────

function mapCouponFromDb(data: Record<string, unknown>): Coupon {
  return {
    id: data.id as string,
    code: (data.code as string) ?? '',
    name: (data.name as string) ?? '',
    type: (data.type as CouponType) ?? 'percentage',
    value: (data.value as number) ?? 0,
    maxUses: (data.max_uses as number | null) ?? null,
    usedCount: (data.used_count as number) ?? 0,
    validFrom: (data.valid_from as string) ?? '',
    validUntil: (data.valid_until as string) ?? null,
    applicablePlans: (data.applicable_plans as PlanTier[]) ?? ['free', 'starter', 'professional', 'enterprise'],
    applicableBillingCycles: data.applicable_billing_cycles as Coupon['applicableBillingCycles'],
    minAmount: (data.min_amount as number) ?? undefined,
    maxDiscount: (data.max_discount as number) ?? undefined,
    isActive: (data.is_active as boolean) ?? true,
    createdAt: (data.created_at as string) ?? '',
    updatedAt: (data.updated_at as string) ?? '',
  }
}
