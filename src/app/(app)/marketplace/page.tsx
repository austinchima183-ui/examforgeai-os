import Link from 'next/link'
import { requireAuth } from '@/lib/auth/require-auth'
import { Store, Star, Download, ShoppingBag, ShoppingCart, MessageSquare, LayoutDashboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getMarketplaceData } from '@/lib/services/marketplace-service'
import type { MarketplaceProduct } from '@/lib/services/marketplace-service'
import { MarketplaceSearch } from '@/components/filters/marketplace-search'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Marketplace Page
// ============================================================================
// Server Component. Displays marketplace products from Supabase.
// No mock data. All products are live.
// Premium AI OS visual treatment applied.
// ============================================================================

const categoryLabelMap: Record<string, string> = {
  exam_pack: 'Exam Packs',
  question_set: 'Question Sets',
  template: 'Templates',
  course: 'Courses',
  ai_tool: 'AI Tools',
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price)
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  return (
    <Link href={`/marketplace/${product.id}`}>
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-300 cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border-white/[0.06] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-1">
              {product.isFeatured && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">Featured</Badge>
              )}
              {product.isNew && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">New</Badge>
              )}
            </div>
          </div>

          <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.title}</h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{product.description}</p>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-ember text-ember" />
              <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
            <span className="text-xs text-muted-foreground ml-auto">
              <Download className="h-3 w-3 inline mr-0.5" />
              {product.downloadCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{product.price > 0 ? formatPrice(product.price) : 'Free'}</span>
            <Button size="sm" variant={product.price > 0 ? 'default' : 'outline'} asChild className={product.price > 0 ? 'forge-glow' : 'hover:border-primary/50 transition-all duration-200'}>
              <span>{product.price > 0 ? 'Buy' : 'Get'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function MarketplacePage() {
  const { user } = await requireAuth()

  // Fetch live data from Supabase
  const data = await getMarketplaceData()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight forge-gradient-text">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Browse and purchase educational content, exam packs, and AI tools.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-2 hover:border-primary/50 transition-all duration-200">
            <Link href="/marketplace/cart">
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2 hover:border-primary/50 transition-all duration-200">
            <Link href="/marketplace/reviews">
              <MessageSquare className="h-4 w-4" />
              Reviews
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2 hover:border-primary/50 transition-all duration-200">
            <Link href="/marketplace/seller">
              <LayoutDashboard className="h-4 w-4" />
              Seller
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <MarketplaceSearch />

      {/* Featured Products */}
      {data.featured.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Featured</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      <Tabs defaultValue="all">
        <TabsList className="forge-glass-surface border-white/[0.04] rounded-xl p-1">
          <TabsTrigger value="all" className="data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">All ({data.products.length})</TabsTrigger>
          {data.categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
              {categoryLabelMap[cat] ?? cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {data.products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl forge-glass-surface border-white/[0.04] forge-card-shadow">
                  <ShoppingBag className="h-7 w-7 text-foreground/40" />
                </div>
              </div>
              <p className="text-base font-medium text-foreground">No products available</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">Marketplace products will appear here once they are published.</p>
            </div>
          )}
        </TabsContent>

        {data.categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {data.products.filter(p => p.category === cat).length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.products
                  .filter(p => p.category === cat)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl forge-glass-surface border-white/[0.04] forge-card-shadow">
                    <ShoppingBag className="h-6 w-6 text-foreground/40" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">No {categoryLabelMap[cat]?.toLowerCase() ?? cat} available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check back soon for new additions.
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
