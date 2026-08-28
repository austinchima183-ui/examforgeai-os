// ============================================================================
// ExamForge AI — Marketplace V2 Central Exports
// ============================================================================
// Single entry point for all marketplace-v2 modules.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  ProductType,
  LicensingType,
  ListingStatus,
  ProductListing,
  ProductListingMetadata,
  ProductListingStats,
  ProductReview,
  SellerReviewResponse,
  PurchaseRecord,
  PurchaseStatus,
  License,
  RevenueShareConfig,
  RevenueShareTier,
  RevenueShareBreakdown,
  SellerProfile,
  PayoutMethod,
  VerificationStatus,
  PayoutRecord,
  PayoutStatus,
  MarketplaceCategory,
  MarketplaceSearchFilters,
  SortOption,
  SearchResult,
  CartItem,
  WishlistItem,
  ReviewStats,
  SellerStats,
  MonthlyRevenueEntry,
  ServiceResult,
  PaginatedResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Listing Service
// ──────────────────────────────────────────────────────────────

export {
  createListing,
  getListing,
  updateListing,
  deleteListing,
  publishListing,
  unpublishListing,
  searchListings,
  getListingsBySeller,
  getListingsByCategory,
  getFeaturedListings,
  incrementViewCount,
  getRelatedListings,
} from './listing-service'

export type {
  CreateListingInput,
  UpdateListingInput,
} from './listing-service'

// ──────────────────────────────────────────────────────────────
// Purchase Service
// ──────────────────────────────────────────────────────────────

export {
  purchaseProduct,
  getPurchases,
  verifyLicense,
  activateLicense,
  deactivateLicense,
  checkSeatUsage,
  incrementDownloadCount,
  refundPurchase,
  transferLicense,
} from './purchase-service'

export type {
  PurchaseFilters,
} from './purchase-service'

// ──────────────────────────────────────────────────────────────
// Review Service
// ──────────────────────────────────────────────────────────────

export {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  respondToReview,
  markReviewHelpful,
  reportReview,
  getReviewStats,
} from './review-service'

export type {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilters,
} from './review-service'

// ──────────────────────────────────────────────────────────────
// Seller Service
// ──────────────────────────────────────────────────────────────

export {
  createSellerProfile,
  getSellerProfile,
  updateSellerProfile,
  getSellerStats,
  getSellerRevenue,
  requestVerification,
  verifySeller,
  getSellerPayouts,
  processPayout,
  calculateRevenueShare,
} from './seller-service'

export type {
  CreateSellerProfileInput,
  UpdateSellerProfileInput,
} from './seller-service'

// ──────────────────────────────────────────────────────────────
// Category Management
// ──────────────────────────────────────────────────────────────

export {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  getProductCount,
} from './marketplace-categories'

export type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './marketplace-categories'
