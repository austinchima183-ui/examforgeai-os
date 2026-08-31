'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createClientOrNull } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Package,
  DollarSign,
  TrendingUp,
  Star,
  Plus,
  Edit3,
  Eye,
  BarChart3,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Wallet,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// ExamForge AI — Seller Dashboard Page
// ============================================================================

interface SellerProduct {
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

interface SellerAnalytics {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  averageRating: number
  monthlyRevenue: { month: string; revenue: number; sales: number }[]
  topProducts: SellerProduct[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price)
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // New product form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('exam_pack')
  const [newPrice, setNewPrice] = useState('0')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchSellerData()
  }, [])

  async function fetchSellerData() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClientOrNull()
      if (!supabase) throw new Error('Not authenticated')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const [productsRes, analyticsRes] = await Promise.all([
        fetch(`/api/marketplace/seller/products?userId=${user.id}`),
        fetch(`/api/marketplace/seller/analytics?userId=${user.id}`),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products ?? [])
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProduct() {
    if (!newTitle.trim()) {
      toast.error('Title is required')
      return
    }

    setCreating(true)
    try {
      const res = await apiFetch('/api/marketplace/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          price: parseFloat(newPrice) || 0,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Product created!')
        setCreateOpen(false)
        setNewTitle('')
        setNewDescription('')
        setNewPrice('0')
        setNewCategory('exam_pack')
        fetchSellerData()
      } else {
        toast.error(data.error ?? 'Failed to create product')
      }
    } catch {
      toast.error('Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  const maxRevenue = analytics?.monthlyRevenue
    ? Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1)
    : 1

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading seller dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="text-lg font-medium">Failed to load dashboard</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchSellerData}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your products, track sales, and withdraw earnings.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg forge-glass-elevated border-white/[0.06] rounded-xl">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="seller-title" className="text-sm font-medium mb-1.5 block">Title</label>
                <Input id="seller-title" className="forge-input-glow" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., JAMB Mathematics Pack 2025" />
              </div>
              <div>
                <label htmlFor="seller-desc" className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea id="seller-desc" className="forge-input-glow" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Describe your product..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="seller-category" className="text-sm font-medium mb-1.5 block">Category</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger id="seller-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam_pack">Exam Pack</SelectItem>
                      <SelectItem value="question_set">Question Set</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="ai_tool">AI Tool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="seller-price" className="text-sm font-medium mb-1.5 block">Price (₦)</label>
                  <Input
                    id="seller-price"
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0"
                    className="forge-input-glow"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="seller-upload" className="text-sm font-medium mb-1.5 block">Upload Question Bank</label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports CSV, JSON, XLSX</p>
                  <Input id="seller-upload" type="file" className="sr-only forge-input-glow" accept=".csv,.json,.xlsx" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateProduct} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-xl font-bold">{analytics.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold">{analytics.totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">{formatPrice(analytics.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Chart + Products */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            My Products
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Earnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          {products.length > 0 ? (
            products.map(product => (
              <Card key={product.id} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{product.title}</h3>
                        <Badge
                          variant={product.status === 'published' ? 'default' : product.status === 'draft' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {product.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs">{product.rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {product.salesCount} sales · {formatPrice(product.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/marketplace/${product.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardContent className="p-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-lg font-medium">No products yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Create your first product to start selling.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          {/* Revenue Over Time */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Revenue Over Time</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.monthlyRevenue ? (
                <div className="space-y-3">
                  {analytics.monthlyRevenue.map(m => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary rounded transition-all"
                          style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-24 text-right">{formatPrice(m.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No analytics data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          {analytics?.topProducts && analytics.topProducts.length > 0 && (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardHeader>
                <CardTitle className="text-base">Top Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.topProducts.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.salesCount} sales</p>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(p.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="mt-4 space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Available Balance</CardTitle>
                  <CardDescription>Earnings from marketplace sales</CardDescription>
                </div>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-xs text-muted-foreground">Withdrawable</p>
                <p className="text-3xl font-bold">
                  {formatPrice(analytics ? Math.round(analytics.totalRevenue * 0.85) : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  15% platform fee deducted
                </p>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Revenue</span>
                <span className="font-medium">{formatPrice(analytics?.totalRevenue ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (15%)</span>
                <span className="font-medium text-destructive">-{formatPrice(analytics ? Math.round(analytics.totalRevenue * 0.15) : 0)}</span>
              </div>
              <Separator />
              <Button className="w-full gap-2" disabled>
                <Wallet className="h-4 w-4" />
                Withdraw Earnings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
