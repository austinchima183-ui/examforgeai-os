// ============================================================================
// ExamForge AI — Marketplace V2 Listing Service
// ============================================================================
// Product listing CRUD: create, read, update, delete, publish, search,
// category browse, featured listings, view tracking, related products.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  ProductListing,
  ProductListingMetadata,
  ProductListingStats,
  ProductType,
  LicensingType,
  ListingStatus,
  MarketplaceSearchFilters,
  SearchResult,
  ServiceResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Create Listing Input
// ──────────────────────────────────────────────────────────────

export interface CreateListingInput {
  sellerId: string
  sellerOrgId: string
  type: ProductType
  title: string
  description: string
  price: number
  currency: string
  licensing: LicensingType
  version: string
  category: string
  tags: string[]
  previewUrl?: string | null
  downloadUrl?: string | null
  thumbnailUrl?: string | null
  screenshots?: string[]
  metadata?: ProductListingMetadata
}

export interface UpdateListingInput {
  title?: string
  description?: string
  price?: number
  currency?: string
  licensing?: LicensingType
  version?: string
  category?: string
  tags?: string[]
  previewUrl?: string | null
  downloadUrl?: string | null
  thumbnailUrl?: string | null
  screenshots?: string[]
  metadata?: ProductListingMetadata
  status?: ListingStatus
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to ProductListing
// ──────────────────────────────────────────────────────────────

function mapRowToListing(row: Record<string, unknown>): ProductListing {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerOrgId: row.seller_org_id as string,
    type: row.type as ProductType,
    title: row.title as string,
    description: row.description as string,
    price: row.price as number,
    currency: (row.currency as string) ?? 'USD',
    licensing: row.licensing as LicensingType,
    version: (row.version as string) ?? '1.0.0',
    category: row.category as string,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    previewUrl: (row.preview_url as string) ?? null,
    downloadUrl: (row.download_url as string) ?? null,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    screenshots: Array.isArray(row.screenshots) ? (row.screenshots as string[]) : [],
    status: (row.status as ListingStatus) ?? 'draft',
    metadata: (row.metadata as ProductListingMetadata) ?? {},
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
  }
}

// ──────────────────────────────────────────────────────────────
// createListing
// ──────────────────────────────────────────────────────────────

export async function createListing(input: CreateListingInput): Promise<ServiceResult<ProductListing>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({
      seller_id: input.sellerId,
      seller_org_id: input.sellerOrgId,
      type: input.type,
      title: input.title,
      description: input.description,
      price: input.price,
      currency: input.currency,
      licensing: input.licensing,
      version: input.version,
      category: input.category,
      tags: input.tags,
      preview_url: input.previewUrl ?? null,
      download_url: input.downloadUrl ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      screenshots: input.screenshots ?? [],
      metadata: input.metadata ?? {},
      status: 'draft',
      views: 0,
      purchase_count: 0,
      rating: 0,
      revenue: 0,
      review_count: 0,
      download_count: 0,
      wishlist_count: 0,
      featured: false,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[listing-service] createListing error:', error)
    return { success: false, error: 'Failed to create product listing' }
  }

  return { success: true, data: mapRowToListing(data) }
}

// ──────────────────────────────────────────────────────────────
// getListing
// ──────────────────────────────────────────────────────────────

export async function getListing(id: string): Promise<ServiceResult<ProductListing>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('[listing-service] getListing error:', error)
    return { success: false, error: 'Product listing not found' }
  }

  return { success: true, data: mapRowToListing(data) }
}

// ──────────────────────────────────────────────────────────────
// updateListing
// ──────────────────────────────────────────────────────────────

export async function updateListing(id: string, updates: UpdateListingInput): Promise<ServiceResult<ProductListing>> {
  const supabase = await createClient()

  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) row.title = updates.title
  if (updates.description !== undefined) row.description = updates.description
  if (updates.price !== undefined) row.price = updates.price
  if (updates.currency !== undefined) row.currency = updates.currency
  if (updates.licensing !== undefined) row.licensing = updates.licensing
  if (updates.version !== undefined) row.version = updates.version
  if (updates.category !== undefined) row.category = updates.category
  if (updates.tags !== undefined) row.tags = updates.tags
  if (updates.previewUrl !== undefined) row.preview_url = updates.previewUrl
  if (updates.downloadUrl !== undefined) row.download_url = updates.downloadUrl
  if (updates.thumbnailUrl !== undefined) row.thumbnail_url = updates.thumbnailUrl
  if (updates.screenshots !== undefined) row.screenshots = updates.screenshots
  if (updates.metadata !== undefined) row.metadata = updates.metadata
  if (updates.status !== undefined) row.status = updates.status

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[listing-service] updateListing error:', error)
    return { success: false, error: 'Failed to update product listing' }
  }

  return { success: true, data: mapRowToListing(data) }
}

// ──────────────────────────────────────────────────────────────
// deleteListing (soft delete → status = 'archived')
// ──────────────────────────────────────────────────────────────

export async function deleteListing(id: string): Promise<ServiceResult<boolean>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('marketplace_listings')
    .update({ status: 'archived' })
    .eq('id', id)

  if (error) {
    console.error('[listing-service] deleteListing error:', error)
    return { success: false, error: 'Failed to delete product listing' }
  }

  return { success: true, data: true }
}

// ──────────────────────────────────────────────────────────────
// publishListing
// ──────────────────────────────────────────────────────────────

export async function publishListing(id: string): Promise<ServiceResult<ProductListing>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[listing-service] publishListing error:', error)
    return { success: false, error: 'Failed to publish listing' }
  }

  return { success: true, data: mapRowToListing(data) }
}

// ──────────────────────────────────────────────────────────────
// unpublishListing
// ──────────────────────────────────────────────────────────────

export async function unpublishListing(id: string): Promise<ServiceResult<ProductListing>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update({ status: 'unpublished' })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[listing-service] unpublishListing error:', error)
    return { success: false, error: 'Failed to unpublish listing' }
  }

  return { success: true, data: mapRowToListing(data) }
}

// ──────────────────────────────────────────────────────────────
// searchListings
// ──────────────────────────────────────────────────────────────

export async function searchListings(
  query: string,
  filters: MarketplaceSearchFilters = {}
): Promise<SearchResult<ProductListing>> {
  const supabase = await createClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let qb = supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact' })
    .eq('status', 'published')

  // Text search on title and description
  if (query.trim()) {
    qb = qb.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  }

  // Type filter
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type]
    qb = qb.in('type', types)
  }

  // Category filter
  if (filters.category) {
    const cats = Array.isArray(filters.category) ? filters.category : [filters.category]
    qb = qb.in('category', cats)
  }

  // Licensing filter
  if (filters.licensing) {
    const licenses = Array.isArray(filters.licensing) ? filters.licensing : [filters.licensing]
    qb = qb.in('licensing', licenses)
  }

  // Price range filter
  if (filters.priceRange) {
    if (filters.priceRange.min !== undefined) {
      qb = qb.gte('price', filters.priceRange.min)
    }
    if (filters.priceRange.max !== undefined) {
      qb = qb.lte('price', filters.priceRange.max)
    }
  }

  // Rating filter
  if (filters.rating !== undefined) {
    qb = qb.gte('rating', filters.rating)
  }

  // Seller filter
  if (filters.sellerId) {
    qb = qb.eq('seller_id', filters.sellerId)
  }

  // Featured filter
  if (filters.featured) {
    qb = qb.eq('featured', true)
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    qb = qb.overlaps('tags', filters.tags)
  }

  // Sort order
  const sortBy = filters.sortBy ?? 'relevance'
  switch (sortBy) {
    case 'newest':
      qb = qb.order('created_at', { ascending: false })
      break
    case 'price_asc':
      qb = qb.order('price', { ascending: true })
      break
    case 'price_desc':
      qb = qb.order('price', { ascending: false })
      break
    case 'rating':
      qb = qb.order('rating', { ascending: false })
      break
    case 'popular':
      qb = qb.order('purchase_count', { ascending: false })
      break
    case 'most_downloaded':
      qb = qb.order('download_count', { ascending: false })
      break
    case 'relevance':
    default:
      qb = qb.order('rating', { ascending: false })
      break
  }

  // Pagination
  qb = qb.range(from, to)

  const { data, count, error } = await qb

  if (error) {
    console.error('[listing-service] searchListings error:', error)
    return { items: [], total: 0, page, pageSize, totalPages: 0 }
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    items: (data ?? []).map(mapRowToListing),
    total,
    page,
    pageSize,
    totalPages,
  }
}

// ──────────────────────────────────────────────────────────────
// getListingsBySeller
// ──────────────────────────────────────────────────────────────

export async function getListingsBySeller(sellerId: string): Promise<ServiceResult<ProductListing[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('seller_id', sellerId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listing-service] getListingsBySeller error:', error)
    return { success: false, error: 'Failed to fetch seller listings' }
  }

  return { success: true, data: (data ?? []).map(mapRowToListing) }
}

// ──────────────────────────────────────────────────────────────
// getListingsByCategory
// ──────────────────────────────────────────────────────────────

export async function getListingsByCategory(
  category: string,
  page = 1,
  pageSize = 20
): Promise<SearchResult<ProductListing>> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .eq('category', category)
    .order('rating', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[listing-service] getListingsByCategory error:', error)
    return { items: [], total: 0, page, pageSize, totalPages: 0 }
  }

  const total = count ?? 0

  return {
    items: (data ?? []).map(mapRowToListing),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ──────────────────────────────────────────────────────────────
// getFeaturedListings
// ──────────────────────────────────────────────────────────────

export async function getFeaturedListings(limit = 12): Promise<ServiceResult<ProductListing[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'published')
    .eq('featured', true)
    .order('rating', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listing-service] getFeaturedListings error:', error)
    return { success: false, error: 'Failed to fetch featured listings' }
  }

  return { success: true, data: (data ?? []).map(mapRowToListing) }
}

// ──────────────────────────────────────────────────────────────
// incrementViewCount
// ──────────────────────────────────────────────────────────────

export async function incrementViewCount(id: string): Promise<ServiceResult<boolean>> {
  const supabase = await createClient()

  // Use atomic increment via RPC if available; otherwise read-then-write
  let rpcError: unknown = null
  try {
    const result = await supabase.rpc('increment_listing_views', { listing_id: id })
    rpcError = result.error
  } catch {
    rpcError = 'rpc_not_available'
  }

  if (!rpcError) {
    return { success: true, data: true }
  }

  // Fallback: manual increment
  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('views')
    .eq('id', id)
    .single()

  if (!listing) {
    return { success: false, error: 'Listing not found' }
  }

  const { error } = await supabase
    .from('marketplace_listings')
    .update({ views: (listing.views as number) + 1 })
    .eq('id', id)

  if (error) {
    console.error('[listing-service] incrementViewCount error:', error)
    return { success: false, error: 'Failed to increment view count' }
  }

  return { success: true, data: true }
}

// ──────────────────────────────────────────────────────────────
// getRelatedListings
// ──────────────────────────────────────────────────────────────

export async function getRelatedListings(productId: string, limit = 6): Promise<ServiceResult<ProductListing[]>> {
  const supabase = await createClient()

  // First get the source product's type and category
  const { data: source } = await supabase
    .from('marketplace_listings')
    .select('type, category, tags')
    .eq('id', productId)
    .single()

  if (!source) {
    return { success: false, error: 'Source product not found' }
  }

  // Find related: same type or category, exclude self, published only
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'published')
    .neq('id', productId)
    .or(`type.eq.${source.type},category.eq.${source.category}`)
    .order('rating', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listing-service] getRelatedListings error:', error)
    return { success: false, error: 'Failed to fetch related listings' }
  }

  return { success: true, data: (data ?? []).map(mapRowToListing) }
}
