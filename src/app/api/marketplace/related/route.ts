import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const category = searchParams.get('category')

  if (!productId || !category) {
    return NextResponse.json({ error: 'productId and category required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select(`
      id, title, description, author_id, category, price, currency,
      rating, total_reviews, download_count, is_featured, thumbnail_url, status, created_at
    `)
    .eq('status', 'approved')
    .eq('category', category)
    .neq('id', productId)
    .limit(4)

  if (error || !products) {
    return NextResponse.json({ products: [] })
  }

  const authorIds = [...new Set(products.map(p => p.author_id).filter(Boolean))] as string[]
  const { data: authors } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', authorIds.length > 0 ? authorIds : ['__none__'])

  const authorMap = new Map<string, string>()
  for (const a of authors ?? []) {
    authorMap.set(a.id, a.full_name ?? 'Unknown Author')
  }

  const mapped = products.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    author: p.author_id ? (authorMap.get(p.author_id) ?? 'Unknown Author') : 'ExamForge Team',
    price: p.price ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.total_reviews ?? 0,
    downloadCount: p.download_count ?? 0,
    thumbnail: p.thumbnail_url,
  }))

  return NextResponse.json({ products: mapped })
}
