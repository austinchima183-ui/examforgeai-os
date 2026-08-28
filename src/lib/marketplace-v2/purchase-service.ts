// ============================================================================
// ExamForge AI — Marketplace V2 Purchase & Licensing Service
// ============================================================================
// Handles purchases, license key generation, activation, verification,
// seat management, download tracking, refunds, and license transfers.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  PurchaseRecord,
  License,
  LicensingType,
  PurchaseStatus,
  ServiceResult,
  PaginatedResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// License Key Generation (UUID-based, cryptographic)
// ──────────────────────────────────────────────────────────────

function generateLicenseKey(): string {
  // Generate 5 groups of 5 alphanumeric chars: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments: string[] = []

  // Use crypto.getRandomValues for cryptographic randomness
  for (let s = 0; s < 5; s++) {
    let segment = ''
    const randomValues = new Uint8Array(5)
    crypto.getRandomValues(randomValues)
    for (let i = 0; i < 5; i++) {
      segment += chars[randomValues[i] % chars.length]
    }
    segments.push(segment)
  }

  return segments.join('-')
}

// ──────────────────────────────────────────────────────────────
// Default seat counts per license type
// ──────────────────────────────────────────────────────────────

function defaultSeatsForLicenseType(type: LicensingType): number {
  switch (type) {
    case 'single':
      return 1
    case 'site':
      return 50
    case 'district':
      return 500
    case 'unlimited':
      return 999999
    default:
      return 1
  }
}

// ──────────────────────────────────────────────────────────────
// License expiry calculation
// ──────────────────────────────────────────────────────────────

function calculateExpiry(type: LicensingType): string | null {
  // All paid licenses expire in 1 year; unlimited never expires
  if (type === 'unlimited') return null
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 1)
  return expiry.toISOString()
}

// ──────────────────────────────────────────────────────────────
// Map DB rows
// ──────────────────────────────────────────────────────────────

function mapRowToPurchase(row: Record<string, unknown>): PurchaseRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productTitle: (row.product_title as string) ?? '',
    buyerId: row.buyer_id as string,
    buyerOrgId: (row.buyer_org_id as string) ?? '',
    pricePaid: row.price_paid as number,
    currency: (row.currency as string) ?? 'USD',
    licenseType: row.license_type as LicensingType,
    licenseKey: (row.license_key as string) ?? '',
    expiresAt: (row.expires_at as string) ?? null,
    downloadCount: (row.download_count as number) ?? 0,
    status: (row.status as PurchaseStatus) ?? 'pending',
    refundReason: (row.refund_reason as string) ?? null,
    refundedAt: (row.refunded_at as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapRowToLicense(row: Record<string, unknown>): License {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productTitle: (row.product_title as string) ?? '',
    purchaserOrgId: row.purchaser_org_id as string,
    type: row.type as LicensingType,
    key: row.key as string,
    seats: (row.seats as number) ?? 1,
    seatsUsed: (row.seats_used as number) ?? 0,
    expiresAt: (row.expires_at as string) ?? null,
    isActive: (row.is_active as boolean) ?? false,
    activatedAt: (row.activated_at as string) ?? '',
    deactivatedAt: (row.deactivated_at as string) ?? null,
    createdAt: row.created_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// purchaseProduct
// ──────────────────────────────────────────────────────────────

export async function purchaseProduct(
  productId: string,
  buyerId: string,
  licenseType: LicensingType
): Promise<ServiceResult<PurchaseRecord>> {
  const supabase = await createClient()

  // Check if already purchased with an active license
  const { data: existing } = await supabase
    .from('marketplace_purchases_v2')
    .select('id, status')
    .eq('buyer_id', buyerId)
    .eq('product_id', productId)
    .in('status', ['pending', 'completed'])
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'You have already purchased this product' }
  }

  // Get product details
  const { data: product } = await supabase
    .from('marketplace_listings')
    .select('id, title, price, currency, seller_id, seller_org_id')
    .eq('id', productId)
    .eq('status', 'published')
    .single()

  if (!product) {
    return { success: false, error: 'Product not found or not available for purchase' }
  }

  // Determine buyer org (users table has school_id — org-scoped purchases fall back to school)
  const { data: buyerProfile } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', buyerId)
    .single()

  const buyerOrgId = (buyerProfile?.school_id as string) ?? ''
  const licenseKey = generateLicenseKey()
  const expiresAt = calculateExpiry(licenseType)
  const seats = defaultSeatsForLicenseType(licenseType)

  // Create purchase record
  const { data: purchase, error } = await supabase
    .from('marketplace_purchases_v2')
    .insert({
      product_id: productId,
      product_title: product.title,
      buyer_id: buyerId,
      buyer_org_id: buyerOrgId,
      price_paid: product.price,
      currency: product.currency ?? 'USD',
      license_type: licenseType,
      license_key: licenseKey,
      expires_at: expiresAt,
      download_count: 0,
      status: 'completed',
    })
    .select('*')
    .single()

  if (error) {
    console.error('[purchase-service] purchaseProduct error:', error)
    return { success: false, error: 'Failed to process purchase' }
  }

  // Create license record
  await supabase
    .from('marketplace_licenses')
    .insert({
      product_id: productId,
      product_title: product.title,
      purchaser_org_id: buyerOrgId,
      type: licenseType,
      key: licenseKey,
      seats,
      seats_used: 0,
      expires_at: expiresAt,
      is_active: true,
      activated_at: new Date().toISOString(),
    })
    .then(({ error: licError }) => {
      if (licError) {
        console.error('[purchase-service] license creation error:', licError)
      }
    })

  // Increment purchase count on listing
  try {
    await supabase.rpc('increment_listing_purchases', { listing_id: productId })
  } catch {
    // Fallback
    supabase
      .from('marketplace_listings')
      .select('purchase_count')
      .eq('id', productId)
      .single()
      .then(({ data: d }) => {
        if (d) {
          supabase
            .from('marketplace_listings')
            .update({ purchase_count: ((d.purchase_count as number) ?? 0) + 1 })
            .eq('id', productId)
        }
      })
  }

  // Increment revenue on listing
  try {
    await supabase.rpc('increment_listing_revenue', {
      listing_id: productId,
      amount: product.price,
    })
  } catch {
    supabase
      .from('marketplace_listings')
      .select('revenue')
      .eq('id', productId)
      .single()
      .then(({ data: d }) => {
        if (d) {
          supabase
            .from('marketplace_listings')
            .update({ revenue: ((d.revenue as number) ?? 0) + product.price })
            .eq('id', productId)
        }
      })
  }

  return { success: true, data: mapRowToPurchase(purchase) }
}

// ──────────────────────────────────────────────────────────────
// getPurchases
// ──────────────────────────────────────────────────────────────

export interface PurchaseFilters {
  status?: PurchaseStatus | PurchaseStatus[]
  productId?: string
  licenseType?: LicensingType
  page?: number
  pageSize?: number
}

export async function getPurchases(
  buyerId: string,
  filters: PurchaseFilters = {}
): Promise<PaginatedResult<PurchaseRecord>> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let qb = supabase
    .from('marketplace_purchases_v2')
    .select('*', { count: 'exact' })
    .eq('buyer_id', buyerId)

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    qb = qb.in('status', statuses)
  }
  if (filters.productId) {
    qb = qb.eq('product_id', filters.productId)
  }
  if (filters.licenseType) {
    qb = qb.eq('license_type', filters.licenseType)
  }

  qb = qb.order('created_at', { ascending: false }).range(from, to)

  const { data, count, error } = await qb

  if (error) {
    console.error('[purchase-service] getPurchases error:', error)
    return { items: [], total: 0, page, pageSize, totalPages: 0 }
  }

  const total = count ?? 0
  return {
    items: (data ?? []).map(mapRowToPurchase),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ──────────────────────────────────────────────────────────────
// verifyLicense
// ──────────────────────────────────────────────────────────────

export async function verifyLicense(productId: string, orgId: string): Promise<ServiceResult<License>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_licenses')
    .select('*')
    .eq('product_id', productId)
    .eq('purchaser_org_id', orgId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[purchase-service] verifyLicense error:', error)
    return { success: false, error: 'License verification failed' }
  }

  if (!data) {
    return { success: false, error: 'No active license found for this product and organization' }
  }

  const license = mapRowToLicense(data)

  // Check expiry
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { success: false, error: 'License has expired' }
  }

  // Check seat usage for seat-limited licenses
  if (license.type !== 'unlimited' && license.seatsUsed >= license.seats) {
    return { success: false, error: 'License seat limit has been reached' }
  }

  return { success: true, data: license }
}

// ──────────────────────────────────────────────────────────────
// activateLicense
// ──────────────────────────────────────────────────────────────

export async function activateLicense(licenseKey: string, orgId: string): Promise<ServiceResult<License>> {
  const supabase = await createClient()

  // Find the license by key
  const { data, error } = await supabase
    .from('marketplace_licenses')
    .select('*')
    .eq('key', licenseKey)
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: 'Invalid license key' }
  }

  const license = mapRowToLicense(data)

  // Check if already active for the same org
  if (license.isActive && license.purchaserOrgId === orgId) {
    return { success: true, data: license }
  }

  // Check if license is already active for a different org (single-use)
  if (license.isActive && license.purchaserOrgId !== orgId && license.type === 'single') {
    return { success: false, error: 'License is already activated for another organization' }
  }

  // Check expiry
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { success: false, error: 'License has expired' }
  }

  // Activate
  const { data: updated, error: updateError } = await supabase
    .from('marketplace_licenses')
    .update({
      purchaser_org_id: orgId,
      is_active: true,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
    })
    .eq('id', license.id)
    .select('*')
    .single()

  if (updateError) {
    console.error('[purchase-service] activateLicense error:', updateError)
    return { success: false, error: 'Failed to activate license' }
  }

  return { success: true, data: mapRowToLicense(updated) }
}

// ──────────────────────────────────────────────────────────────
// deactivateLicense
// ──────────────────────────────────────────────────────────────

export async function deactivateLicense(licenseId: string): Promise<ServiceResult<License>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_licenses')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq('id', licenseId)
    .select('*')
    .single()

  if (error) {
    console.error('[purchase-service] deactivateLicense error:', error)
    return { success: false, error: 'Failed to deactivate license' }
  }

  return { success: true, data: mapRowToLicense(data) }
}

// ──────────────────────────────────────────────────────────────
// checkSeatUsage
// ──────────────────────────────────────────────────────────────

export async function checkSeatUsage(licenseId: string): Promise<ServiceResult<{
  seats: number
  seatsUsed: number
  seatsAvailable: number
  utilizationPercent: number
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_licenses')
    .select('seats, seats_used, type')
    .eq('id', licenseId)
    .single()

  if (error || !data) {
    return { success: false, error: 'License not found' }
  }

  const seats = data.seats as number
  const seatsUsed = data.seats_used as number
  const seatsAvailable = data.type === 'unlimited' ? Infinity : Math.max(0, seats - seatsUsed)
  const utilizationPercent = data.type === 'unlimited' ? 0 : Math.round((seatsUsed / seats) * 100)

  return {
    success: true,
    data: {
      seats,
      seatsUsed,
      seatsAvailable: data.type === 'unlimited' ? 999999 : seatsAvailable,
      utilizationPercent,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// incrementDownloadCount
// ──────────────────────────────────────────────────────────────

export async function incrementDownloadCount(purchaseId: string): Promise<ServiceResult<number>> {
  const supabase = await createClient()

  // Get current count
  const { data: purchase } = await supabase
    .from('marketplace_purchases_v2')
    .select('download_count, product_id')
    .eq('id', purchaseId)
    .single()

  if (!purchase) {
    return { success: false, error: 'Purchase record not found' }
  }

  const newCount = ((purchase.download_count as number) ?? 0) + 1

  // Update purchase download count
  const { error } = await supabase
    .from('marketplace_purchases_v2')
    .update({ download_count: newCount })
    .eq('id', purchaseId)

  if (error) {
    console.error('[purchase-service] incrementDownloadCount error:', error)
    return { success: false, error: 'Failed to increment download count' }
  }

  // Also increment listing download count
  try {
    await supabase.rpc('increment_listing_downloads', { listing_id: purchase.product_id })
  } catch {
    supabase
      .from('marketplace_listings')
      .select('download_count')
      .eq('id', purchase.product_id)
      .single()
      .then(({ data: d }) => {
        if (d) {
          supabase
            .from('marketplace_listings')
            .update({ download_count: ((d.download_count as number) ?? 0) + 1 })
            .eq('id', purchase.product_id)
        }
      })
  }

  // Increment seat usage on the associated license
  try {
    await supabase.rpc('increment_license_seat_usage', { purchase_id: purchaseId })
  } catch {
    // Fallback: find and increment license seat usage
    supabase
      .from('marketplace_licenses')
      .select('id, seats_used, seats, type')
      .eq('product_id', purchase.product_id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data: lic }) => {
        if (lic && lic.type !== 'unlimited' && (lic.seats_used as number) < (lic.seats as number)) {
          supabase
            .from('marketplace_licenses')
            .update({ seats_used: ((lic.seats_used as number) ?? 0) + 1 })
            .eq('id', lic.id)
        }
      })
  }

  return { success: true, data: newCount }
}

// ──────────────────────────────────────────────────────────────
// refundPurchase
// ──────────────────────────────────────────────────────────────

export async function refundPurchase(
  purchaseId: string,
  reason: string
): Promise<ServiceResult<PurchaseRecord>> {
  const supabase = await createClient()

  // Get the purchase
  const { data: purchase } = await supabase
    .from('marketplace_purchases_v2')
    .select('*')
    .eq('id', purchaseId)
    .single()

  if (!purchase) {
    return { success: false, error: 'Purchase not found' }
  }

  if ((purchase.status as string) !== 'completed') {
    return { success: false, error: 'Only completed purchases can be refunded' }
  }

  // Update purchase status
  const { data, error } = await supabase
    .from('marketplace_purchases_v2')
    .update({
      status: 'refunded',
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .select('*')
    .single()

  if (error) {
    console.error('[purchase-service] refundPurchase error:', error)
    return { success: false, error: 'Failed to process refund' }
  }

  // Deactivate the associated license
  await supabase
    .from('marketplace_licenses')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq('product_id', purchase.product_id)
    .eq('purchaser_org_id', purchase.buyer_org_id)

  // Decrement purchase count and revenue on listing
  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('purchase_count, revenue')
    .eq('id', purchase.product_id)
    .single()

  if (listing) {
    await supabase
      .from('marketplace_listings')
      .update({
        purchase_count: Math.max(0, ((listing.purchase_count as number) ?? 0) - 1),
        revenue: Math.max(0, ((listing.revenue as number) ?? 0) - (purchase.price_paid as number)),
      })
      .eq('id', purchase.product_id)
  }

  return { success: true, data: mapRowToPurchase(data) }
}

// ──────────────────────────────────────────────────────────────
// transferLicense
// ──────────────────────────────────────────────────────────────

export async function transferLicense(
  licenseId: string,
  newOrgId: string
): Promise<ServiceResult<License>> {
  const supabase = await createClient()

  // Get the license
  const { data: license } = await supabase
    .from('marketplace_licenses')
    .select('*')
    .eq('id', licenseId)
    .single()

  if (!license) {
    return { success: false, error: 'License not found' }
  }

  if (!license.is_active) {
    return { success: false, error: 'Cannot transfer an inactive license' }
  }

  // Check if target org already has a license for this product
  const { data: existing } = await supabase
    .from('marketplace_licenses')
    .select('id')
    .eq('product_id', license.product_id)
    .eq('purchaser_org_id', newOrgId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Target organization already has an active license for this product' }
  }

  // Transfer: update org, reset seat usage
  const { data, error } = await supabase
    .from('marketplace_licenses')
    .update({
      purchaser_org_id: newOrgId,
      seats_used: 0,
      activated_at: new Date().toISOString(),
    })
    .eq('id', licenseId)
    .select('*')
    .single()

  if (error) {
    console.error('[purchase-service] transferLicense error:', error)
    return { success: false, error: 'Failed to transfer license' }
  }

  // Also update the purchase record's buyer org
  await supabase
    .from('marketplace_purchases_v2')
    .update({ buyer_org_id: newOrgId })
    .eq('product_id', license.product_id)
    .eq('license_key', license.key)

  return { success: true, data: mapRowToLicense(data) }
}
