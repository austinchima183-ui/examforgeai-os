'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createClientOrNull } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Star,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Flag,
  Reply,
  Send,
  ThumbsUp,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// ExamForge AI — Review Management Page
// ============================================================================

interface Review {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  productId: string
  productTitle: string
  rating: number
  text: string
  sellerResponse: string | null
  createdAt: string
}

interface PurchasedProduct {
  id: string
  title: string
  hasReview: boolean
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground'}`}
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

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Review form
  const [writeOpen, setWriteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [newText, setNewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Seller response
  const [responseOpen, setResponseOpen] = useState(false)
  const [responseReviewId, setResponseReviewId] = useState('')
  const [responseText, setResponseText] = useState('')
  const [responding, setResponding] = useState(false)

  // Report
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReviewId, setReportReviewId] = useState('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClientOrNull()
      if (!supabase) throw new Error('Not authenticated')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch reviews for user's purchased products
      const [reviewsRes, purchasesRes] = await Promise.all([
        fetch(`/api/marketplace/reviews?userId=${user.id}`),
        fetch(`/api/marketplace/my-purchases?userId=${user.id}`),
      ])

      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setReviews(data.reviews ?? [])
      }

      if (purchasesRes.ok) {
        const data = await purchasesRes.json()
        setPurchasedProducts(data.products ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitReview() {
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }
    if (newRating === 0) {
      toast.error('Please select a rating')
      return
    }
    if (!newText.trim()) {
      toast.error('Please write a review')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          rating: newRating,
          text: newText,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Review submitted!')
        setWriteOpen(false)
        setNewRating(0)
        setNewText('')
        setSelectedProduct('')
        fetchData()
      } else {
        toast.error(data.error ?? 'Failed to submit review')
      }
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRespondToReview() {
    if (!responseText.trim()) {
      toast.error('Please write a response')
      return
    }

    setResponding(true)
    try {
      const res = await apiFetch('/api/marketplace/reviews/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: responseReviewId,
          response: responseText,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Response submitted!')
        setResponseOpen(false)
        setResponseText('')
        fetchData()
      } else {
        toast.error(data.error ?? 'Failed to submit response')
      }
    } catch {
      toast.error('Failed to submit response')
    } finally {
      setResponding(false)
    }
  }

  async function handleReportReview() {
    setReporting(true)
    try {
      const res = await apiFetch('/api/marketplace/reviews/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: reportReviewId }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Review reported. Our team will review it.')
        setReportOpen(false)
      } else {
        toast.error(data.error ?? 'Failed to report review')
      }
    } catch {
      toast.error('Failed to report review')
    } finally {
      setReporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="text-lg font-medium">Failed to load reviews</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  const unratedProducts = purchasedProducts.filter(p => !p.hasReview)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Manage reviews for your purchases and products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/marketplace')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Marketplace
          </Button>
          {unratedProducts.length > 0 && (
            <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Write Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Write a Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="rev-product" className="text-sm font-medium mb-1.5 block">Product</label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger id="rev-product">
                        <SelectValue placeholder="Select a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unratedProducts.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="rev-rating" className="text-sm font-medium mb-2 block">Rating</label>
                    <InteractiveStarRating value={newRating} onChange={setNewRating} />
                  </div>
                  <div>
                    <label htmlFor="rev-text" className="text-sm font-medium mb-1.5 block">Your Review</label>
                    <Textarea
                      id="rev-text"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Share your experience..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSubmitReview} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Review
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4 animate-fade-in">
          {reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={review.userAvatar ?? undefined} />
                    <AvatarFallback>{review.userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{review.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            on {review.productTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => {
                            setReportReviewId(review.id)
                            setReportOpen(true)
                          }}
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </Button>
                        {!review.sellerResponse && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => {
                              setResponseReviewId(review.id)
                              setResponseOpen(true)
                            }}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm">{review.text}</p>

                    {review.sellerResponse && (
                      <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">Seller Response</p>
                        <p className="text-sm text-muted-foreground">{review.sellerResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-lg font-medium">No reviews yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {purchasedProducts.length > 0
                ? 'Write a review for a product you\'ve purchased.'
                : 'Purchase products from the marketplace to leave reviews.'}
            </p>
            {purchasedProducts.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={() => router.push('/marketplace')}>
                Browse Marketplace
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seller Response Dialog */}
      <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRespondToReview} disabled={responding}>
              {responding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to report this review as inappropriate? Our team will review it and take action if necessary.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleReportReview} disabled={reporting}>
              {reporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
