'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, createClientOrNull } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import {
  Star,
  Download,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Heart,
  Loader2,
  AlertCircle,
  MessageSquare,
  Eye,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

// ============================================================================
// ExamForge AI — Marketplace Product Detail Page
// ============================================================================
// Client component with full product view, purchase, cart, and reviews.
// ============================================================================

interface ProductDetail {
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
  previewQuestions: { id: string; text: string; type: string; options: string[] }[]
  createdAt: string
  status: string
}

interface Review {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  rating: number
  text: string
  sellerResponse: string | null
  createdAt: string
}

interface RelatedProduct {
  id: string
  title: string
  description: string
  author: string
  price: number
  rating: number
  reviewCount: number
  downloadCount: number
  thumbnail: string | null
}

function formatPrice(price: number, currency: string = 'NGN'): string {
  if (price === 0) return 'Free'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground'}`}
        />
      ))}
    </div>
  )
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="p-0.5"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star className={`h-6 w-6 ${(hover || value) >= star ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground'} transition-colors`} />
        </button>
      ))}
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [hasPurchased, setHasPurchased] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  // Review form state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Re-fetchable product data loader (used by useEffect and after review submission)
  async function fetchProductData() {
    if (!productId) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClientOrNull()
      if (!supabase) throw new Error('Supabase client not available')

      // Fetch product detail
      const productRes = await fetch(`/api/marketplace/product?id=${productId}`)
      if (!productRes.ok) throw new Error('Product not found')
      const productData = await productRes.json()
      setProduct(productData)

      // Fetch reviews
      const reviewsRes = await fetch(`/api/marketplace/reviews?productId=${productId}`)
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json()
        setReviews(reviewsData.reviews ?? [])
      }

      // Fetch related products
      const relatedRes = await fetch(`/api/marketplace/related?productId=${productId}&category=${productData.category}`)
      if (relatedRes.ok) {
        const relatedData = await relatedRes.json()
        setRelatedProducts(relatedData.products ?? [])
      }

      // Check purchase status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const purchaseRes = await fetch(`/api/marketplace/purchase-status?userId=${user.id}&productId=${productId}`)
        if (purchaseRes.ok) {
          const purchaseData = await purchaseRes.json()
          setHasPurchased(purchaseData.purchased ?? false)
        }

        // Check cart
        const cartStr = localStorage.getItem('examforge_cart')
        if (cartStr) {
          const cart = JSON.parse(cartStr) as { productId: string }[]
          setInCart(cart.some(item => item.productId === productId))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductData()
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePurchase() {
    setPurchasing(true)
    try {
      const res = await apiFetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()

      if (data.success) {
        setHasPurchased(true)
        toast.success('Purchase successful! You now have access to this content.')
      } else {
        toast.error(data.error ?? 'Purchase failed')
      }
    } catch {
      toast.error('Failed to complete purchase')
    } finally {
      setPurchasing(false)
    }
  }

  function handleAddToCart() {
    if (!product || inCart) return

    const cartStr = localStorage.getItem('examforge_cart') ?? '[]'
    const cart = JSON.parse(cartStr)
    cart.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      thumbnail: product.thumbnail,
      author: product.author,
    })
    localStorage.setItem('examforge_cart', JSON.stringify(cart))
    setInCart(true)
    toast.success('Added to cart')
  }

  async function handleSubmitReview() {
    if (reviewRating === 0) {
      toast.error('Please select a rating')
      return
    }
    if (!reviewText.trim()) {
      toast.error('Please write a review')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await apiFetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: reviewRating,
          text: reviewText,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Review submitted!')
        setReviewRating(0)
        setReviewText('')
        fetchProductData()
      } else {
        toast.error(data.error ?? 'Failed to submit review')
      }
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading product...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => router.push('/marketplace')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
        <Card className="border-destructive/50 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h3 className="text-lg font-medium">Product not found</h3>
            <p className="text-sm text-muted-foreground mt-1">{error ?? 'This product does not exist or has been removed.'}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={() => router.push('/marketplace')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Header */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Thumbnail */}
                <div className="w-full sm:w-48 h-48 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {product.thumbnail ? (
                    <Image src={product.thumbnail} alt={product.title} width={192} height={192} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{product.category.replace(/_/g, ' ')}</Badge>
                        {product.isFeatured && <Badge variant="default">Featured</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setWishlisted(!wishlisted); toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist') }}
                    >
                      <Heart className={`h-5 w-5 ${wishlisted ? 'fill-destructive text-destructive' : ''}`} />
                    </Button>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={product.authorAvatar ?? undefined} />
                      <AvatarFallback>{product.author.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{product.author}</span>
                  </div>

                  {/* Rating & Stats */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={product.rating} />
                      <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Download className="h-4 w-4" />
                      {product.downloadCount} downloads
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-2xl font-bold">{formatPrice(product.price, product.currency)}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {hasPurchased ? (
                      <Button className="gap-2" disabled>
                        <CheckCircle2 className="h-4 w-4" />
                        Purchased
                      </Button>
                    ) : (
                      <>
                        <Button className="gap-2" onClick={handlePurchase} disabled={purchasing}>
                          {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          {purchasing ? 'Processing...' : product.price > 0 ? 'Purchase Now' : 'Get Free'}
                        </Button>
                        {product.price > 0 && (
                          <Button variant="outline" className="gap-2" onClick={handleAddToCart} disabled={inCart}>
                            <ShoppingCart className="h-4 w-4" />
                            {inCart ? 'In Cart' : 'Add to Cart'}
                          </Button>
                        )}
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description & Preview Tabs */}
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              {product.screenshots.length > 0 && (
                <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="mt-4">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardContent className="p-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm leading-relaxed">{product.longDescription || product.description}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="text-base">Preview Content</CardTitle>
                  <CardDescription>First {product.previewQuestions.length} questions from this question bank</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.previewQuestions.length > 0 ? (
                    product.previewQuestions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 shrink-0">Q{idx + 1}</Badge>
                          <div className="space-y-2 flex-1">
                            <p className="text-sm font-medium">{q.text}</p>
                            {q.options.length > 0 && (
                              <div className="space-y-1">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-mono text-xs">{String.fromCharCode(65 + optIdx)}.</span>
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            <Badge variant="secondary" className="text-[10px]">{q.type.replace(/_/g, ' ')}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Preview content is available after purchase</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {product.screenshots.length > 0 && (
              <TabsContent value="screenshots" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {product.screenshots.map((src, idx) => (
                    <Card key={idx} className="overflow-hidden">
                      <Image src={src} alt={`Screenshot ${idx + 1}`} width={400} height={192} className="w-full h-48 object-cover" />
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Reviews Section */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Reviews</CardTitle>
                  <CardDescription>{product.reviewCount} reviews · {product.rating.toFixed(1)} average</CardDescription>
                </div>
                {hasPurchased && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Write Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label htmlFor="review-rating" className="text-sm font-medium mb-2 block">Rating</label>
                          <InteractiveStarRating value={reviewRating} onChange={setReviewRating} />
                        </div>
                        <div>
                          <label htmlFor="review-text" className="text-sm font-medium mb-2 block">Your Review</label>
                          <Textarea
                            id="review-text"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your experience with this product..."
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitReview} disabled={submittingReview}>
                          {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Submit Review
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={review.userAvatar ?? undefined} />
                        <AvatarFallback>{review.userName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{review.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                        <p className="text-sm text-muted-foreground">{review.text}</p>
                        {review.sellerResponse && (
                          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-xs font-medium text-primary mb-1">Seller Response</p>
                            <p className="text-sm text-muted-foreground">{review.sellerResponse}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 animate-fade-in">
          {/* Quick Info */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="text-base">Product Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium capitalize">{product.category.replace(/_/g, ' ')}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">{formatPrice(product.price, product.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloads</span>
                <span className="font-medium">{product.downloadCount}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Published</span>
                <span className="font-medium">{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader>
                <CardTitle className="text-base">Related Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedProducts.map(rp => (
                  <button
                    key={rp.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                    onClick={() => router.push(`/marketplace/${rp.id}`)}
                  >
                    <p className="text-sm font-medium line-clamp-1">{rp.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs">{rp.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">by {rp.author}</span>
                      <span className="text-xs font-medium ml-auto">{formatPrice(rp.price)}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
