import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Get products
  const { data: products } = await supabase
    .from('marketplace_products')
    .select('id, price, rating, total_reviews')
    .eq('author_id', userId)

  const productIds = (products ?? []).map((p: { id: string }) => p.id)

  // Get purchases
  const { data: purchases } = await supabase
    .from('marketplace_purchases')
    .select('product_id, amount, created_at')
    .in('product_id', productIds.length > 0 ? productIds : ['__none__'])
    .eq('status', 'completed')

  const allPurchases = purchases ?? []
  const totalRevenue = allPurchases.reduce((sum: number, p: { amount: number | null }) => sum + (p.amount ?? 0), 0)
  const avgRating = (products ?? []).length > 0
    ? (products ?? []).reduce((sum: number, p: { rating: number | null }) => sum + (p.rating ?? 0), 0) / products!.length
    : 0

  // Monthly revenue (last 6 months)
  const monthlyRevenue = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const monthPurchases = allPurchases.filter((p: { created_at: string }) => {
      const createdAt = new Date(p.created_at)
      return createdAt >= monthStart && createdAt <= monthEnd
    })

    monthlyRevenue.push({
      month: monthStr,
      revenue: monthPurchases.reduce((sum: number, p: { amount: number | null }) => sum + (p.amount ?? 0), 0),
      sales: monthPurchases.length,
    })
  }

  // Top products
  const salesMap = new Map<string, { count: number; revenue: number }>()
  for (const p of allPurchases) {
    const existing = salesMap.get(p.product_id) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += (p as { amount: number | null }).amount ?? 0
    salesMap.set(p.product_id, existing)
  }

  // Get product details for top products
  const { data: topProductData } = await supabase
    .from('marketplace_products')
    .select('id, title, description, category, price, status, rating, total_reviews, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  const topProducts = (topProductData ?? []).map((p: { id: string; title: string; description: string | null; category: string | null; price: number | null; status: string | null; rating: number | null; total_reviews: number | null; created_at: string }) => {
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
  }).sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
    .slice(0, 5)

  return NextResponse.json({
    totalProducts: (products ?? []).length,
    totalSales: allPurchases.length,
    totalRevenue,
    averageRating: Math.round(avgRating * 10) / 10,
    monthlyRevenue,
    topProducts,
  })
}
