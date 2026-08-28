// ============================================================================
// ExamForge AI — Marketplace V2 Type Definitions
// ============================================================================
// Comprehensive types for the True Marketplace: Courses, Question Banks,
// Curriculum, Lesson Plans, AI Models, Certificates, Themes, Plugins,
// Templates, Analytics Packs, Institution Packages.
// Supports Payments, Reviews, Licensing, and Revenue Sharing.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Product Type Enum
// ──────────────────────────────────────────────────────────────

export type ProductType =
  | 'course'
  | 'question_bank'
  | 'curriculum'
  | 'lesson_plan'
  | 'ai_model'
  | 'certificate_template'
  | 'theme'
  | 'plugin'
  | 'template'
  | 'analytics_pack'
  | 'institution_package'

// ──────────────────────────────────────────────────────────────
// Licensing
// ──────────────────────────────────────────────────────────────

export type LicensingType = 'single' | 'site' | 'district' | 'unlimited'

export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'unpublished' | 'rejected' | 'archived'

// ──────────────────────────────────────────────────────────────
// Product Listing
// ──────────────────────────────────────────────────────────────

export interface ProductListingMetadata {
  /** For courses: duration in hours */
  durationHours?: number
  /** For courses: number of lessons/modules */
  moduleCount?: number
  /** For question banks: total questions */
  questionCount?: number
  /** For question banks: covered subjects */
  subjects?: string[]
  /** For question banks: difficulty levels available */
  difficultyLevels?: string[]
  /** For AI models: model framework/runtime */
  modelFramework?: string
  /** For AI models: model size in MB */
  modelSizeMb?: number
  /** For plugins/templates: compatible versions */
  compatibleVersions?: string[]
  /** For themes: color palette */
  colorPalette?: string[]
  /** For analytics packs: data sources */
  dataSources?: string[]
  /** For institution packages: included product IDs */
  includedProductIds?: string[]
  /** For institution packages: max seats */
  maxSeats?: number
  /** File size in bytes for downloadable products */
  fileSizeBytes?: number
  /** File format (e.g., 'json', 'pdf', 'zip') */
  fileFormat?: string
  /** Preview/demo available */
  hasPreview?: boolean
  /** Documentation URL */
  documentationUrl?: string
  /** Changelog URL */
  changelogUrl?: string
  /** Support email */
  supportEmail?: string
  /** Requirements or prerequisites */
  requirements?: string[]
}

export interface ProductListingStats {
  views: number
  purchases: number
  rating: number
  revenue: number
  reviewCount: number
  downloadCount: number
  wishlistCount: number
}

export interface ProductListing {
  id: string
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
  previewUrl: string | null
  downloadUrl: string | null
  thumbnailUrl: string | null
  screenshots: string[]
  status: ListingStatus
  metadata: ProductListingMetadata
  stats: ProductListingStats
  featured: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

// ──────────────────────────────────────────────────────────────
// Product Review
// ──────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string
  productId: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  helpful: number
  verified: boolean
  response: SellerReviewResponse | null
  reported: boolean
  reportReason: string | null
  createdAt: string
  updatedAt: string
}

export interface SellerReviewResponse {
  body: string
  respondedAt: string
}

// ──────────────────────────────────────────────────────────────
// Purchase Record
// ──────────────────────────────────────────────────────────────

export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'disputed' | 'failed'

export interface PurchaseRecord {
  id: string
  productId: string
  productTitle: string
  buyerId: string
  buyerOrgId: string
  pricePaid: number
  currency: string
  licenseType: LicensingType
  licenseKey: string
  expiresAt: string | null
  downloadCount: number
  status: PurchaseStatus
  refundReason: string | null
  refundedAt: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// License
// ──────────────────────────────────────────────────────────────

export interface License {
  id: string
  productId: string
  productTitle: string
  purchaserOrgId: string
  type: LicensingType
  key: string
  seats: number
  seatsUsed: number
  expiresAt: string | null
  isActive: boolean
  activatedAt: string
  deactivatedAt: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Revenue Share
// ──────────────────────────────────────────────────────────────

export interface RevenueShareConfig {
  sellerSharePercent: number
  platformSharePercent: number
  minPayout: number
  payoutSchedule: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  /** Additional tiered overrides — e.g., top sellers get higher share */
  tierOverrides?: RevenueShareTier[]
}

export interface RevenueShareTier {
  /** Minimum total revenue to qualify for this tier */
  minRevenue: number
  sellerSharePercent: number
  platformSharePercent: number
}

export interface RevenueShareBreakdown {
  grossAmount: number
  platformShare: number
  sellerShare: number
  sellerSharePercent: number
  platformSharePercent: number
  tier: string
}

// ──────────────────────────────────────────────────────────────
// Seller Profile
// ──────────────────────────────────────────────────────────────

export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'mobile_money' | 'crypto'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface SellerPayoutConfig {
  method: PayoutMethod
  /** JSON-serialized config for the payout provider (bank details, PayPal email, etc.) */
  config: Record<string, string>
}

export interface SellerProfile {
  id: string
  orgId: string
  displayName: string
  bio: string
  avatarUrl: string | null
  rating: number
  totalSales: number
  totalRevenue: number
  verified: VerificationStatus
  payoutMethod: PayoutMethod
  payoutConfig: Record<string, string>
  websiteUrl: string | null
  specializations: ProductType[]
  createdAt: string
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Payout Record
// ──────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface PayoutRecord {
  id: string
  sellerId: string
  amount: number
  currency: string
  period: string
  status: PayoutStatus
  transactionRef: string | null
  paidAt: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Marketplace Category
// ──────────────────────────────────────────────────────────────

export interface MarketplaceCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  parent: string | null
  productCount: number
  sortOrder: number
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Search & Filters
// ──────────────────────────────────────────────────────────────

export type SortOption =
  | 'relevance'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'popular'
  | 'most_downloaded'

export interface MarketplaceSearchFilters {
  type?: ProductType | ProductType[]
  category?: string | string[]
  priceRange?: { min?: number; max?: number }
  rating?: number
  licensing?: LicensingType | LicensingType[]
  sortBy?: SortOption
  tags?: string[]
  sellerId?: string
  featured?: boolean
  query?: string
  page?: number
  pageSize?: number
}

export interface SearchResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ──────────────────────────────────────────────────────────────
// Cart & Wishlist
// ──────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  quantity: number
  licenseType: LicensingType
}

export interface WishlistItem {
  productId: string
  addedAt: string
}

// ──────────────────────────────────────────────────────────────
// Review Stats
// ──────────────────────────────────────────────────────────────

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

// ──────────────────────────────────────────────────────────────
// Seller Stats
// ──────────────────────────────────────────────────────────────

export interface SellerStats {
  totalProducts: number
  activeProducts: number
  totalSales: number
  totalRevenue: number
  averageRating: number
  monthlyRevenue: MonthlyRevenueEntry[]
  topProducts: ProductListing[]
  pendingPayouts: number
}

export interface MonthlyRevenueEntry {
  month: string
  revenue: number
  sales: number
}

// ──────────────────────────────────────────────────────────────
// Service Result Types
// ──────────────────────────────────────────────────────────────

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
