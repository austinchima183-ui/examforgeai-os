// ============================================================================
// ExamForge AI — Marketplace V2 Category Management
// ============================================================================
// Category CRUD, slug-based lookups, and product count tracking.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  MarketplaceCategory,
  ServiceResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Map DB row to MarketplaceCategory
// ──────────────────────────────────────────────────────────────

function mapRowToCategory(row: Record<string, unknown>): MarketplaceCategory {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    slug: (row.slug as string) ?? '',
    description: (row.description as string) ?? '',
    icon: (row.icon as string) ?? null,
    parent: (row.parent as string) ?? null,
    productCount: (row.product_count as number) ?? 0,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
  }
}

// ──────────────────────────────────────────────────────────────
// Category Input Types
// ──────────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string
  slug: string
  description: string
  icon?: string | null
  parent?: string | null
  sortOrder?: number
}

export interface UpdateCategoryInput {
  name?: string
  slug?: string
  description?: string
  icon?: string | null
  parent?: string | null
  sortOrder?: number
}

// ──────────────────────────────────────────────────────────────
// getCategories
// ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<ServiceResult<MarketplaceCategory[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[marketplace-categories] getCategories error:', error)
    return { success: false, error: 'Failed to fetch categories' }
  }

  const categories = (data ?? []).map(mapRowToCategory)

  // Enrich with live product counts
  const enriched = await Promise.all(
    categories.map(async (cat) => {
      const count = await getProductCountInternal(cat.slug)
      return { ...cat, productCount: count }
    })
  )

  return { success: true, data: enriched }
}

// ──────────────────────────────────────────────────────────────
// getCategory (by slug)
// ──────────────────────────────────────────────────────────────

export async function getCategory(slug: string): Promise<ServiceResult<MarketplaceCategory>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    console.error('[marketplace-categories] getCategory error:', error)
    return { success: false, error: 'Category not found' }
  }

  const category = mapRowToCategory(data)
  category.productCount = await getProductCountInternal(slug)

  return { success: true, data: category }
}

// ──────────────────────────────────────────────────────────────
// createCategory
// ──────────────────────────────────────────────────────────────

export async function createCategory(input: CreateCategoryInput): Promise<ServiceResult<MarketplaceCategory>> {
  const supabase = await createClient()

  // Check for slug uniqueness
  const { data: existing } = await supabase
    .from('marketplace_categories')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'A category with this slug already exists' }
  }

  const { data, error } = await supabase
    .from('marketplace_categories')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon ?? null,
      parent: input.parent ?? null,
      product_count: 0,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[marketplace-categories] createCategory error:', error)
    return { success: false, error: 'Failed to create category' }
  }

  return { success: true, data: mapRowToCategory(data) }
}

// ──────────────────────────────────────────────────────────────
// updateCategory
// ──────────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  updates: UpdateCategoryInput
): Promise<ServiceResult<MarketplaceCategory>> {
  const supabase = await createClient()

  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.slug !== undefined) row.slug = updates.slug
  if (updates.description !== undefined) row.description = updates.description
  if (updates.icon !== undefined) row.icon = updates.icon
  if (updates.parent !== undefined) row.parent = updates.parent
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

  // Check slug uniqueness if updating slug
  if (updates.slug !== undefined) {
    const { data: existing } = await supabase
      .from('marketplace_categories')
      .select('id')
      .eq('slug', updates.slug)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'A category with this slug already exists' }
    }
  }

  const { data, error } = await supabase
    .from('marketplace_categories')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[marketplace-categories] updateCategory error:', error)
    return { success: false, error: 'Failed to update category' }
  }

  return { success: true, data: mapRowToCategory(data) }
}

// ──────────────────────────────────────────────────────────────
// getProductCount
// ──────────────────────────────────────────────────────────────

export async function getProductCount(categoryId: string): Promise<ServiceResult<number>> {
  const supabase = await createClient()

  // Get category slug from ID
  const { data: category } = await supabase
    .from('marketplace_categories')
    .select('slug')
    .eq('id', categoryId)
    .single()

  if (!category) {
    return { success: false, error: 'Category not found' }
  }

  const count = await getProductCountInternal(category.slug as string)
  return { success: true, data: count }
}

// ──────────────────────────────────────────────────────────────
// Internal: Count published products for a category slug
// ──────────────────────────────────────────────────────────────

async function getProductCountInternal(categorySlug: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact', head: true })
    .eq('category', categorySlug)
    .eq('status', 'published')

  if (error) {
    console.error('[marketplace-categories] getProductCountInternal error:', error)
    return 0
  }

  return count ?? 0
}
