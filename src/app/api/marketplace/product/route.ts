import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { uuidParam, paginationSchema } from '@/lib/validators/api-schemas'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryObj = Object.fromEntries(searchParams.entries())
  const marketplaceProductQuerySchema = z.object({ id: uuidParam }).merge(paginationSchema)
  const queryResult = validateInput(marketplaceProductQuerySchema, queryObj)
  if ('error' in queryResult) return queryResult.error
  const productId = (queryResult.data as Record<string, unknown>).id as string

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data: product, error } = await supabase
    .from('marketplace_products')
    .select(`
      id, title, description, long_description, author_id, category,
      price, currency, rating, total_reviews, download_count,
      is_featured, thumbnail_url, screenshots, status, created_at, updated_at
    `)
    .eq('id', productId)
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Get author
  const { data: author } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .eq('id', product.author_id)
    .single()

  // Get preview questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, type, options')
    .eq('marketplace_product_id', productId)
    .limit(3)

  return NextResponse.json({
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
    previewQuestions: (questions ?? []).map((q: { id: string; text: string | null; type: string | null; options: unknown }) => ({
      id: q.id,
      text: q.text ?? '',
      type: q.type ?? 'single_choice',
      options: Array.isArray(q.options) ? q.options.map((o: unknown) => String(o)) : [],
    })),
    createdAt: product.created_at,
    updatedAt: product.updated_at ?? product.created_at,
    status: product.status ?? 'published',
  })
}
