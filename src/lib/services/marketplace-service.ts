// ============================================================================
// ExamForge AI — Marketplace Data Service
// ============================================================================
// Server-side data fetching for the marketplace.
// All queries use the Supabase server client with cookie-based auth.
// ============================================================================

import { createClient, createClientOrNull } from '@/lib/supabase/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface MarketplaceProduct {
  id: string
  title: string
  description: string
  author: string
  authorId: string
  category: string
  price: number
  rating: number
  reviewCount: number
  downloadCount: number
  isFeatured: boolean
  isNew: boolean
  thumbnail: string | null
  createdAt: string
}

export interface MarketplacePageData {
  products: MarketplaceProduct[]
  categories: string[]
  featured: MarketplaceProduct[]
}

export interface ProductDetail {
  id: string
  title: string
  description: string
  longDescription: string
  author: string
  authorId: string
  authorAvatar: string | null
  category: string
  price: number
  currency: string
  rating: number
  reviewCount: number
  downloadCount: number
  isFeatured: boolean
  thumbnail: string | null
  screenshots: string[]
  previewQuestions: PreviewQuestion[]
  createdAt: string
  updatedAt: string
  status: string
}

export interface PreviewQuestion {
  id: string
  text: string
  type: string
  options: string[]
}

export interface ProductReview {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  productId: string
  rating: number
  text: string
  sellerResponse: string | null
  createdAt: string
}

export interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
  thumbnail: string | null
  author: string
}

export interface Purchase {
  id: string
  userId: string
  productId: string
  productTitle: string
  amount: number
  status: string
  createdAt: string
}

export interface SellerProduct {
  id: string
  title: string
  description: string
  category: string
  price: number
  status: string
  salesCount: number
  revenue: number
  rating: number
  reviewCount: number
  createdAt: string
}

export interface SellerAnalytics {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  averageRating: number
  monthlyRevenue: { month: string; revenue: number; sales: number }[]
  topProducts: SellerProduct[]
}

// ──────────────────────────────────────────────────────────────
// Marketplace Service
// ──────────────────────────────────────────────────────────────

export async function getMarketplaceData(): Promise<MarketplacePageData> {
  const supabase = await createClientOrNull()

  // Dev adapter fallback when Supabase is not configured
  if (!supabase) {
    return { products: [], categories: ['exam_pack', 'question_set', 'template', 'course', 'ai_tool'], featured: [] }
  }

  // Fetch all published products
  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select(`
      id,
      title,
      description,
      author_id,
      category,
      price,
      currency,
      rating,
      total_reviews,
      download_count,
      is_featured,
      thumbnail_url,
      status,
      created_at
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching marketplace products:', error)
    return { products: [], categories: [], featured: [] }
  }

  // Get author names
  const authorIds = [...new Set((products ?? []).map(p => p.author_id).filter(Boolean))] as string[]
  const { data: authors } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', authorIds.length > 0 ? authorIds : ['__none__'])

  const authorMap = new Map<string, string>()
  for (const a of authors ?? []) {
    authorMap.set(a.id, a.full_name ?? 'Unknown Author')
  }

  // Determine which products are "new" (created in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

  const mapped: MarketplaceProduct[] = (products ?? []).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    author: p.author_id ? (authorMap.get(p.author_id) ?? 'Unknown Author') : 'ExamForge Team',
    authorId: p.author_id ?? '',
    category: p.category ?? 'exam_pack',
    price: p.price ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.total_reviews ?? 0,
    downloadCount: p.download_count ?? 0,
    isFeatured: p.is_featured ?? false,
    isNew: new Date(p.created_at) > sevenDaysAgo,
    thumbnail: p.thumbnail_url,
    createdAt: p.created_at,
  }))

  const categories = [...new Set(mapped.map(p => p.category))].sort()
  const featured = mapped.filter(p => p.isFeatured)

  return {
    products: mapped,
    categories,
    featured,
  }
}

// ──────────────────────────────────────────────────────────────
// Product Detail
// ──────────────────────────────────────────────────────────────

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const supabase = await createClientOrNull()
  if (!supabase) return null

  const { data: product, error } = await supabase
    .from('marketplace_products')
    .select(`
      id,
      title,
      description,
      long_description,
      author_id,
      category,
      price,
      currency,
      rating,
      total_reviews,
      download_count,
      is_featured,
      thumbnail_url,
      screenshots,
      status,
      created_at,
      updated_at
    `)
    .eq('id', productId)
    .single()

  if (error || !product) {
    console.error('Error fetching product detail:', error)
    return null
  }

  // Get author info
  const { data: author } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .eq('id', product.author_id)
    .single()

  // Get preview questions (first 3)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, type, options')
    .eq('marketplace_product_id', productId)
    .limit(3)

  const previewQuestions: PreviewQuestion[] = (questions ?? []).map(q => ({
    id: q.id,
    text: q.text ?? '',
    type: q.type ?? 'single_choice',
    options: Array.isArray(q.options) ? q.options.map((o: unknown) => typeof o === 'string' ? o : String(o)) : [],
  }))

  return {
    id: product.id,
    title: product.title,
    description: product.description ?? '',
    longDescription: product.long_description ?? product.description ?? '',
    author: author?.full_name ?? 'Unknown Author',
    authorId: product.author_id ?? '',
    authorAvatar: author?.avatar_url ?? null,
    category: product.category ?? 'exam_pack',
    price: product.price ?? 0,
    currency: product.currency ?? 'NGN',
    rating: product.rating ?? 0,
    reviewCount: product.total_reviews ?? 0,
    downloadCount: product.download_count ?? 0,
    isFeatured: product.is_featured ?? false,
    thumbnail: product.thumbnail_url,
    screenshots: Array.isArray(product.screenshots) ? product.screenshots.filter((s: unknown) => typeof s === 'string') : [],
    previewQuestions,
    createdAt: product.created_at,
    updatedAt: product.updated_at ?? product.created_at,
    status: product.status ?? 'published',
  }
}

// ──────────────────────────────────────────────────────────────
// Purchase Product
// ──────────────────────────────────────────────────────────────

export async function purchaseProduct(userId: string, productId: string): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  const supabase = await createClientOrNull()
  if (!supabase) return { success: false, error: 'Service unavailable' }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'You have already purchased this product' }
  }

  // Get product price
  const { data: product } = await supabase
    .from('marketplace_products')
    .select('price, title')
    .eq('id', productId)
    .single()

  if (!product) {
    return { success: false, error: 'Product not found' }
  }

  // Create purchase record
  const { data: purchase, error } = await supabase
    .from('marketplace_purchases')
    .insert({
      user_id: userId,
      product_id: productId,
      amount: product.price,
      status: 'completed',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating purchase:', error)
    return { success: false, error: 'Failed to complete purchase' }
  }

  // Increment download count
  // First try the RPC function; if it doesn't exist, do a proper read-then-increment
  const { error: rpcError } = await supabase.rpc('increment_download_count', { product_id: productId })
  if (rpcError) {
    // Fallback: read current count then increment by 1 (NOT price + 1)
    const { data: currentProduct } = await supabase
      .from('marketplace_products')
      .select('download_count')
      .eq('id', productId)
      .single()
    
    if (currentProduct) {
      await supabase
        .from('marketplace_products')
        .update({ download_count: (currentProduct.download_count ?? 0) + 1 })
        .eq('id', productId)
    }
  }

  return { success: true, purchaseId: purchase?.id }
}

// ──────────────────────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────────────────────

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const supabase = await createClientOrNull()
  if (!supabase) return []

  const { data: reviews, error } = await supabase
    .from('marketplace_reviews')
    .select(`
      id,
      buyer_id,
      product_id,
      rating,
      content,
      seller_response,
      created_at
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error || !reviews) {
    console.error('Error fetching reviews:', error)
    return []
  }

  // Get reviewer names
  const userIds = [...new Set(reviews.map(r => r.buyer_id).filter(Boolean))] as string[]
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', userIds.length > 0 ? userIds : ['__none__'])

  const userMap = new Map<string, { name: string; avatar: string | null }>()
  for (const u of users ?? []) {
    userMap.set(u.id, { name: u.full_name ?? 'Anonymous', avatar: u.avatar_url ?? null })
  }

  return reviews.map(r => {
    const user = userMap.get(r.buyer_id) ?? { name: 'Anonymous', avatar: null }
    return {
      id: r.id,
      userId: r.buyer_id,
      userName: user.name,
      userAvatar: user.avatar,
      productId: r.product_id,
      rating: r.rating ?? 0,
      text: r.content ?? '',
      sellerResponse: r.seller_response ?? null,
      createdAt: r.created_at,
    }
  })
}

export async function createReview(
  userId: string,
  productId: string,
  rating: number,
  text: string
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  const supabase = await createClientOrNull()
  if (!supabase) return { success: false, error: 'Service unavailable' }

  // Verify purchase
  const { data: purchase } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (!purchase) {
    return { success: false, error: 'You must purchase this product before reviewing it' }
  }

  // Check for existing review
  const { data: existing } = await supabase
    .from('marketplace_reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'You have already reviewed this product' }
  }

  const { data: review, error } = await supabase
    .from('marketplace_reviews')
    .insert({
      user_id: userId,
      product_id: productId,
      rating,
      text,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating review:', error)
    return { success: false, error: 'Failed to create review' }
  }

  // Update product rating
  const { data: allReviews } = await supabase
    .from('marketplace_reviews')
    .select('rating')
    .eq('product_id', productId)

  if (allReviews && allReviews.length > 0) {
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await supabase
      .from('marketplace_products')
      .update({
        rating: Math.round(avgRating * 10) / 10,
        review_count: allReviews.length,
      })
      .eq('id', productId)
  }

  return { success: true, reviewId: review?.id }
}

export async function respondToReview(
  reviewId: string,
  sellerId: string,
  response: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClientOrNull()
  if (!supabase) return { success: false, error: 'Service unavailable' }

  // Verify the seller owns the product
  const { data: review } = await supabase
    .from('marketplace_reviews')
    .select('product_id')
    .eq('id', reviewId)
    .single()

  if (!review) {
    return { success: false, error: 'Review not found' }
  }

  const { data: product } = await supabase
    .from('marketplace_products')
    .select('author_id')
    .eq('id', review.product_id)
    .single()

  if (!product || product.author_id !== sellerId) {
    return { success: false, error: 'You can only respond to reviews on your own products' }
  }

  const { error } = await supabase
    .from('marketplace_reviews')
    .update({ seller_response: response })
    .eq('id', reviewId)

  if (error) {
    return { success: false, error: 'Failed to submit response' }
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Seller Dashboard
// ──────────────────────────────────────────────────────────────

export async function getSellerProducts(userId: string): Promise<SellerProduct[]> {
  const supabase = await createClientOrNull()
  if (!supabase) return []

  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select(`
      id,
      title,
      description,
      category,
      price,
      status,
      rating,
      total_reviews,
      created_at
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error || !products) {
    console.error('Error fetching seller products:', error)
    return []
  }

  // Get sales counts for each product
  const productIds = products.map(p => p.id)
  const { data: purchases } = await supabase
    .from('marketplace_purchases')
    .select('product_id, amount')
    .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
    .eq('status', 'completed')

  const salesMap = new Map<string, { count: number; revenue: number }>()
  for (const p of purchases ?? []) {
    const existing = salesMap.get(p.product_id) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += p.amount ?? 0
    salesMap.set(p.product_id, existing)
  }

  return products.map(p => {
    const sales = salesMap.get(p.id) ?? { count: 0, revenue: 0 }
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? '',
      category: p.category ?? 'exam_pack',
      price: p.price ?? 0,
      status: p.status ?? 'draft',
      salesCount: sales.count,
      revenue: sales.revenue,
      rating: p.rating ?? 0,
      reviewCount: p.total_reviews ?? 0,
      createdAt: p.created_at,
    }
  })
}

export async function getSellerAnalytics(userId: string): Promise<SellerAnalytics> {
  const supabase = await createClientOrNull()
  if (!supabase) {
    return { totalProducts: 0, totalSales: 0, totalRevenue: 0, averageRating: 0, monthlyRevenue: [], topProducts: [] }
  }

  // Get all products by seller
  const { data: products } = await supabase
    .from('marketplace_products')
    .select('id, price, rating, total_reviews')
    .eq('author_id', userId)

  const productIds = (products ?? []).map(p => p.id)

  // Get all purchases for these products
  const { data: purchases } = await supabase
    .from('marketplace_purchases')
    .select('product_id, amount, created_at')
    .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
    .eq('status', 'completed')

  const allPurchases = purchases ?? []
  const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const avgRating = (products ?? []).length > 0
    ? (products ?? []).reduce((sum, p) => sum + (p.rating ?? 0), 0) / products!.length
    : 0

  // Monthly revenue aggregation (last 6 months)
  const monthlyRevenue: { month: string; revenue: number; sales: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const monthPurchases = allPurchases.filter(p => {
      const createdAt = new Date(p.created_at)
      return createdAt >= monthStart && createdAt <= monthEnd
    })

    monthlyRevenue.push({
      month: monthStr,
      revenue: monthPurchases.reduce((sum, p) => sum + (p.amount ?? 0), 0),
      sales: monthPurchases.length,
    })
  }

  // Top products by revenue
  const salesMap = new Map<string, { count: number; revenue: number }>()
  for (const p of allPurchases) {
    const existing = salesMap.get(p.product_id) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += p.amount ?? 0
    salesMap.set(p.product_id, existing)
  }

  const sellerProducts = await getSellerProducts(userId)
  const topProducts = sellerProducts
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    totalProducts: (products ?? []).length,
    totalSales: allPurchases.length,
    totalRevenue,
    averageRating: Math.round(avgRating * 10) / 10,
    monthlyRevenue,
    topProducts,
  }
}

// ──────────────────────────────────────────────────────────────
// Related Products
// ──────────────────────────────────────────────────────────────

export async function getRelatedProducts(productId: string, category: string): Promise<MarketplaceProduct[]> {
  const supabase = await createClientOrNull()
  if (!supabase) return []

  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select(`
      id,
      title,
      description,
      author_id,
      category,
      price,
      currency,
      rating,
      total_reviews,
      download_count,
      is_featured,
      thumbnail_url,
      status,
      created_at
    `)
    .eq('status', 'published')
    .eq('category', category)
    .neq('id', productId)
    .limit(4)

  if (error || !products) return []

  const authorIds = [...new Set(products.map(p => p.author_id).filter(Boolean))] as string[]
  const { data: authors } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', authorIds.length > 0 ? authorIds : ['__none__'])

  const authorMap = new Map<string, string>()
  for (const a of authors ?? []) {
    authorMap.set(a.id, a.full_name ?? 'Unknown Author')
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

  return products.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    author: p.author_id ? (authorMap.get(p.author_id) ?? 'Unknown Author') : 'ExamForge Team',
    authorId: p.author_id ?? '',
    category: p.category ?? 'exam_pack',
    price: p.price ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.total_reviews ?? 0,
    downloadCount: p.download_count ?? 0,
    isFeatured: p.is_featured ?? false,
    isNew: new Date(p.created_at) > sevenDaysAgo,
    thumbnail: p.thumbnail_url,
    createdAt: p.created_at,
  }))
}

// ──────────────────────────────────────────────────────────────
// Check Purchase Status
// ──────────────────────────────────────────────────────────────

export async function checkPurchaseStatus(userId: string, productId: string): Promise<boolean> {
  const supabase = await createClientOrNull()
  if (!supabase) return false

  const { data } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  return !!data
}
