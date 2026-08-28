// ============================================================================
// ExamForge AI — Marketplace V2 Seller Service
// ============================================================================
// Seller profile management, verification, revenue tracking, payouts,
// and revenue sharing calculations with tiered overrides.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  SellerProfile,
  SellerStats,
  MonthlyRevenueEntry,
  VerificationStatus,
  PayoutMethod,
  PayoutRecord,
  PayoutStatus,
  RevenueShareConfig,
  RevenueShareBreakdown,
  ProductListing,
  ServiceResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Default Revenue Share Configuration
// ──────────────────────────────────────────────────────────────

const DEFAULT_REVENUE_SHARE: RevenueShareConfig = {
  sellerSharePercent: 70,
  platformSharePercent: 30,
  minPayout: 50,
  payoutSchedule: 'monthly',
  tierOverrides: [
    { minRevenue: 10000, sellerSharePercent: 75, platformSharePercent: 25 },
    { minRevenue: 50000, sellerSharePercent: 80, platformSharePercent: 20 },
    { minRevenue: 200000, sellerSharePercent: 85, platformSharePercent: 15 },
  ],
}

// ──────────────────────────────────────────────────────────────
// Map DB row to SellerProfile
// ──────────────────────────────────────────────────────────────

function mapRowToSeller(row: Record<string, unknown>): SellerProfile {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    displayName: (row.display_name as string) ?? '',
    bio: (row.bio as string) ?? '',
    avatarUrl: (row.avatar_url as string) ?? null,
    rating: (row.rating as number) ?? 0,
    totalSales: (row.total_sales as number) ?? 0,
    totalRevenue: (row.total_revenue as number) ?? 0,
    verified: (row.verified as VerificationStatus) ?? 'unverified',
    payoutMethod: (row.payout_method as PayoutMethod) ?? 'bank_transfer',
    payoutConfig: (row.payout_config as Record<string, string>) ?? {},
    websiteUrl: (row.website_url as string) ?? null,
    specializations: Array.isArray(row.specializations) ? (row.specializations as SellerProfile['specializations']) : [],
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? row.created_at as string,
  }
}

function mapRowToPayout(row: Record<string, unknown>): PayoutRecord {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    amount: row.amount as number,
    currency: (row.currency as string) ?? 'USD',
    period: (row.period as string) ?? '',
    status: (row.status as PayoutStatus) ?? 'pending',
    transactionRef: (row.transaction_ref as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    createdAt: row.created_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// Create Seller Profile Input
// ──────────────────────────────────────────────────────────────

export interface CreateSellerProfileInput {
  orgId: string
  displayName: string
  bio: string
  payoutMethod: PayoutMethod
  payoutConfig: Record<string, string>
  websiteUrl?: string | null
  specializations?: SellerProfile['specializations']
}

export interface UpdateSellerProfileInput {
  displayName?: string
  bio?: string
  avatarUrl?: string | null
  payoutMethod?: PayoutMethod
  payoutConfig?: Record<string, string>
  websiteUrl?: string | null
  specializations?: SellerProfile['specializations']
}

// ──────────────────────────────────────────────────────────────
// createSellerProfile
// ──────────────────────────────────────────────────────────────

export async function createSellerProfile(input: CreateSellerProfileInput): Promise<ServiceResult<SellerProfile>> {
  const supabase = await createClient()

  // Check if profile already exists for this org
  const { data: existing } = await supabase
    .from('marketplace_seller_profiles')
    .select('id')
    .eq('org_id', input.orgId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Seller profile already exists for this organization' }
  }

  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .insert({
      org_id: input.orgId,
      display_name: input.displayName,
      bio: input.bio,
      rating: 0,
      total_sales: 0,
      total_revenue: 0,
      verified: 'unverified',
      payout_method: input.payoutMethod,
      payout_config: input.payoutConfig,
      website_url: input.websiteUrl ?? null,
      specializations: input.specializations ?? [],
    })
    .select('*')
    .single()

  if (error) {
    console.error('[seller-service] createSellerProfile error:', error)
    return { success: false, error: 'Failed to create seller profile' }
  }

  return { success: true, data: mapRowToSeller(data) }
}

// ──────────────────────────────────────────────────────────────
// getSellerProfile
// ──────────────────────────────────────────────────────────────

export async function getSellerProfile(orgId: string): Promise<ServiceResult<SellerProfile>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error || !data) {
    console.error('[seller-service] getSellerProfile error:', error)
    return { success: false, error: 'Seller profile not found' }
  }

  return { success: true, data: mapRowToSeller(data) }
}

// ──────────────────────────────────────────────────────────────
// updateSellerProfile
// ──────────────────────────────────────────────────────────────

export async function updateSellerProfile(
  id: string,
  updates: UpdateSellerProfileInput
): Promise<ServiceResult<SellerProfile>> {
  const supabase = await createClient()

  const row: Record<string, unknown> = {}
  if (updates.displayName !== undefined) row.display_name = updates.displayName
  if (updates.bio !== undefined) row.bio = updates.bio
  if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl
  if (updates.payoutMethod !== undefined) row.payout_method = updates.payoutMethod
  if (updates.payoutConfig !== undefined) row.payout_config = updates.payoutConfig
  if (updates.websiteUrl !== undefined) row.website_url = updates.websiteUrl
  if (updates.specializations !== undefined) row.specializations = updates.specializations

  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[seller-service] updateSellerProfile error:', error)
    return { success: false, error: 'Failed to update seller profile' }
  }

  return { success: true, data: mapRowToSeller(data) }
}

// ──────────────────────────────────────────────────────────────
// getSellerStats
// ──────────────────────────────────────────────────────────────

export async function getSellerStats(sellerId: string): Promise<ServiceResult<SellerStats>> {
  const supabase = await createClient()

  // Get seller profile
  const { data: profile } = await supabase
    .from('marketplace_seller_profiles')
    .select('*')
    .eq('id', sellerId)
    .single()

  if (!profile) {
    return { success: false, error: 'Seller profile not found' }
  }

  // Get seller's products
  const { data: products } = await supabase
    .from('marketplace_listings')
    .select('id, price, rating, status')
    .eq('seller_id', profile.org_id)

  const allProducts = products ?? []
  const activeProducts = allProducts.filter(p => p.status === 'published')
  const productIds = allProducts.map(p => p.id)

  // Get purchases for all products
  const { data: purchases } = await supabase
    .from('marketplace_purchases_v2')
    .select('product_id, price_paid, created_at')
    .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
    .eq('status', 'completed')

  const allPurchases = purchases ?? []
  const totalSales = allPurchases.length
  const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.price_paid as number), 0)
  const avgRating = allProducts.length > 0
    ? allProducts.reduce((sum, p) => sum + ((p.rating as number) ?? 0), 0) / allProducts.length
    : 0

  // Monthly revenue (last 6 months)
  const monthlyRevenue: MonthlyRevenueEntry[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    const monthPurchases = allPurchases.filter(p => {
      const createdAt = new Date(p.created_at as string)
      return createdAt >= monthStart && createdAt <= monthEnd
    })

    monthlyRevenue.push({
      month: monthStr,
      revenue: monthPurchases.reduce((sum, p) => sum + (p.price_paid as number), 0),
      sales: monthPurchases.length,
    })
  }

  // Top products by revenue
  const salesByProduct = new Map<string, number>()
  for (const p of allPurchases) {
    const current = salesByProduct.get(p.product_id as string) ?? 0
    salesByProduct.set(p.product_id as string, current + (p.price_paid as number))
  }

  // Get pending payouts
  const { data: pendingPayouts } = await supabase
    .from('marketplace_payouts')
    .select('amount')
    .eq('seller_id', sellerId)
    .eq('status', 'pending')

  const pendingPayoutTotal = (pendingPayouts ?? []).reduce((sum, p) => sum + (p.amount as number), 0)

  // Get top product listings
  const topProductIds = [...salesByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topProducts: ProductListing[] = []
  if (topProductIds.length > 0) {
    const { data: topProductRows } = await supabase
      .from('marketplace_listings')
      .select('*')
      .in('id', topProductIds)

    if (topProductRows) {
      topProducts = topProductRows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        sellerId: row.seller_id as string,
        sellerOrgId: row.seller_org_id as string,
        type: row.type as ProductListing['type'],
        title: row.title as string,
        description: row.description as string,
        price: row.price as number,
        currency: (row.currency as string) ?? 'USD',
        licensing: row.licensing as ProductListing['licensing'],
        version: (row.version as string) ?? '1.0.0',
        category: row.category as string,
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        previewUrl: (row.preview_url as string) ?? null,
        downloadUrl: (row.download_url as string) ?? null,
        thumbnailUrl: (row.thumbnail_url as string) ?? null,
        screenshots: Array.isArray(row.screenshots) ? (row.screenshots as string[]) : [],
        status: row.status as ProductListing['status'],
        metadata: (row.metadata as ProductListing['metadata']) ?? {},
        stats: {
          views: (row.views as number) ?? 0,
          purchases: (row.purchase_count as number) ?? 0,
          rating: (row.rating as number) ?? 0,
          revenue: (row.revenue as number) ?? 0,
          reviewCount: (row.review_count as number) ?? 0,
          downloadCount: (row.download_count as number) ?? 0,
          wishlistCount: (row.wishlist_count as number) ?? 0,
        },
        featured: (row.featured as boolean) ?? false,
        createdAt: row.created_at as string,
        updatedAt: (row.updated_at as string) ?? row.created_at as string,
        publishedAt: (row.published_at as string) ?? null,
      }))
    }
  }

  return {
    success: true,
    data: {
      totalProducts: allProducts.length,
      activeProducts: activeProducts.length,
      totalSales,
      totalRevenue,
      averageRating: Math.round(avgRating * 10) / 10,
      monthlyRevenue,
      topProducts,
      pendingPayouts: pendingPayoutTotal,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// getSellerRevenue
// ──────────────────────────────────────────────────────────────

export async function getSellerRevenue(
  sellerId: string,
  period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<ServiceResult<{
  totalRevenue: number
  totalSales: number
  sellerEarnings: number
  platformFees: number
  dailyBreakdown: { date: string; revenue: number; sales: number }[]
}>> {
  const supabase = await createClient()

  // Get seller profile
  const { data: profile } = await supabase
    .from('marketplace_seller_profiles')
    .select('id, org_id')
    .eq('id', sellerId)
    .single()

  if (!profile) {
    return { success: false, error: 'Seller profile not found' }
  }

  // Calculate date range
  const now = new Date()
  let startDate: Date
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 86400000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterMonth, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'all':
    default:
      startDate = new Date(0)
      break
  }

  // Get product IDs
  const { data: products } = await supabase
    .from('marketplace_listings')
    .select('id')
    .eq('seller_id', profile.org_id)

  const productIds = (products ?? []).map(p => p.id)

  if (productIds.length === 0) {
    return {
      success: true,
      data: {
        totalRevenue: 0,
        totalSales: 0,
        sellerEarnings: 0,
        platformFees: 0,
        dailyBreakdown: [],
      },
    }
  }

  // Get purchases in period
  const { data: purchases } = await supabase
    .from('marketplace_purchases_v2')
    .select('price_paid, created_at')
    .in('product_id', productIds)
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())

  const allPurchases = purchases ?? []
  const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.price_paid as number), 0)
  const totalSales = allPurchases.length

  // Calculate revenue share
  const breakdown = calculateRevenueShare(totalRevenue, DEFAULT_REVENUE_SHARE)

  // Daily breakdown
  const dailyMap = new Map<string, { revenue: number; sales: number }>()
  for (const p of allPurchases) {
    const dateStr = new Date(p.created_at as string).toISOString().split('T')[0]
    const existing = dailyMap.get(dateStr) ?? { revenue: 0, sales: 0 }
    existing.revenue += p.price_paid as number
    existing.sales += 1
    dailyMap.set(dateStr, existing)
  }

  const dailyBreakdown = [...dailyMap.entries()]
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    success: true,
    data: {
      totalRevenue,
      totalSales,
      sellerEarnings: breakdown.sellerShare,
      platformFees: breakdown.platformShare,
      dailyBreakdown,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// requestVerification
// ──────────────────────────────────────────────────────────────

export async function requestVerification(sellerId: string): Promise<ServiceResult<SellerProfile>> {
  const supabase = await createClient()

  // Check current status
  const { data: profile } = await supabase
    .from('marketplace_seller_profiles')
    .select('verified')
    .eq('id', sellerId)
    .single()

  if (!profile) {
    return { success: false, error: 'Seller profile not found' }
  }

  if ((profile.verified as string) === 'verified') {
    return { success: false, error: 'Seller is already verified' }
  }

  if ((profile.verified as string) === 'pending') {
    return { success: false, error: 'Verification request is already pending' }
  }

  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .update({ verified: 'pending' })
    .eq('id', sellerId)
    .select('*')
    .single()

  if (error) {
    console.error('[seller-service] requestVerification error:', error)
    return { success: false, error: 'Failed to request verification' }
  }

  return { success: true, data: mapRowToSeller(data) }
}

// ──────────────────────────────────────────────────────────────
// verifySeller (platform admin action)
// ──────────────────────────────────────────────────────────────

export async function verifySeller(sellerId: string): Promise<ServiceResult<SellerProfile>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .update({ verified: 'verified' })
    .eq('id', sellerId)
    .select('*')
    .single()

  if (error) {
    console.error('[seller-service] verifySeller error:', error)
    return { success: false, error: 'Failed to verify seller' }
  }

  return { success: true, data: mapRowToSeller(data) }
}

// ──────────────────────────────────────────────────────────────
// getSellerPayouts
// ──────────────────────────────────────────────────────────────

export async function getSellerPayouts(sellerId: string): Promise<ServiceResult<PayoutRecord[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_payouts')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[seller-service] getSellerPayouts error:', error)
    return { success: false, error: 'Failed to fetch payout history' }
  }

  return { success: true, data: (data ?? []).map(mapRowToPayout) }
}

// ──────────────────────────────────────────────────────────────
// processPayout
// ──────────────────────────────────────────────────────────────

export async function processPayout(
  sellerId: string,
  amount: number
): Promise<ServiceResult<PayoutRecord>> {
  const supabase = await createClient()

  if (amount < DEFAULT_REVENUE_SHARE.minPayout) {
    return { success: false, error: `Minimum payout amount is ${DEFAULT_REVENUE_SHARE.minPayout}` }
  }

  // Verify seller has sufficient balance
  const { data: profile } = await supabase
    .from('marketplace_seller_profiles')
    .select('total_revenue, payout_method, currency')
    .eq('id', sellerId)
    .single()

  if (!profile) {
    return { success: false, error: 'Seller profile not found' }
  }

  // Calculate available balance (total revenue minus already paid out)
  const { data: completedPayouts } = await supabase
    .from('marketplace_payouts')
    .select('amount')
    .eq('seller_id', sellerId)
    .in('status', ['completed', 'processing'])

  const totalPaidOut = (completedPayouts ?? []).reduce((sum, p) => sum + (p.amount as number), 0)
  const availableBalance = (profile.total_revenue as number) - totalPaidOut

  if (amount > availableBalance) {
    return { success: false, error: 'Requested payout amount exceeds available balance' }
  }

  // Determine period label
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Create payout record
  const { data, error } = await supabase
    .from('marketplace_payouts')
    .insert({
      seller_id: sellerId,
      amount,
      currency: (profile.currency as string) ?? 'USD',
      period,
      status: 'processing',
      transaction_ref: null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[seller-service] processPayout error:', error)
    return { success: false, error: 'Failed to process payout' }
  }

  // In production, this would trigger the actual payment gateway integration.
  // For now, mark as processing and simulate completion.
  const payoutId = data.id as string

  // Simulate payout completion after a brief delay
  setTimeout(async () => {
    const { createClient: createClientInner } = await import('@/lib/supabase/server')
    const sb = await createClientInner()
    await sb
      .from('marketplace_payouts')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        transaction_ref: `TXN-${payoutId.slice(0, 8)}-${Date.now()}`,
      })
      .eq('id', payoutId)
  }, 2000)

  return { success: true, data: mapRowToPayout(data) }
}

// ──────────────────────────────────────────────────────────────
// calculateRevenueShare
// ──────────────────────────────────────────────────────────────

export function calculateRevenueShare(
  saleAmount: number,
  config: RevenueShareConfig = DEFAULT_REVENUE_SHARE
): RevenueShareBreakdown {
  if (saleAmount <= 0) {
    return {
      grossAmount: 0,
      platformShare: 0,
      sellerShare: 0,
      sellerSharePercent: config.sellerSharePercent,
      platformSharePercent: config.platformSharePercent,
      tier: 'base',
    }
  }

  // Determine applicable tier based on cumulative revenue
  let sellerPercent = config.sellerSharePercent
  let platformPercent = config.platformSharePercent
  let tier = 'base'

  if (config.tierOverrides && config.tierOverrides.length > 0) {
    // Sort tiers by minRevenue descending to find highest qualifying tier
    const sortedTiers = [...config.tierOverrides].sort((a, b) => b.minRevenue - a.minRevenue)
    for (const tierOverride of sortedTiers) {
      if (saleAmount >= tierOverride.minRevenue) {
        sellerPercent = tierOverride.sellerSharePercent
        platformPercent = tierOverride.platformSharePercent
        tier = `tier_${tierOverride.minRevenue}`
        break
      }
    }
  }

  const sellerShare = Math.round(saleAmount * (sellerPercent / 100) * 100) / 100
  const platformShare = Math.round((saleAmount - sellerShare) * 100) / 100

  return {
    grossAmount: saleAmount,
    platformShare,
    sellerShare,
    sellerSharePercent: sellerPercent,
    platformSharePercent: platformPercent,
    tier,
  }
}
