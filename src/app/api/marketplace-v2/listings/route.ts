import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/marketplace-v2/listings — Search listings
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') ?? ''
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') ?? 'relevance'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    let dbQuery = supabase
      .from('marketplace_products')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }
    if (category) dbQuery = dbQuery.eq('category', category)
    if (type) dbQuery = dbQuery.eq('product_type', type)
    if (minPrice) dbQuery = dbQuery.gte('price', parseFloat(minPrice))
    if (maxPrice) dbQuery = dbQuery.lte('price', parseFloat(maxPrice))

    switch (sortBy) {
      case 'price_asc':
        dbQuery = dbQuery.order('price', { ascending: true })
        break
      case 'price_desc':
        dbQuery = dbQuery.order('price', { ascending: false })
        break
      case 'newest':
        dbQuery = dbQuery.order('created_at', { ascending: false })
        break
      case 'rating':
        dbQuery = dbQuery.order('average_rating', { ascending: false })
        break
      case 'popular':
        dbQuery = dbQuery.order('download_count', { ascending: false })
        break
      default:
        dbQuery = dbQuery.order('is_featured', { ascending: false })
        break
    }

    const { data: listings, count, error } = await dbQuery.range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 })
    }

    return NextResponse.json({
      listings: listings ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search listings', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/marketplace-v2/listings — Create listing
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: listing, error } = await supabase
      .from('marketplace_products')
      .insert({
        title: body.title,
        description: body.description,
        long_description: body.longDescription ?? '',
        category: body.category,
        type: body.type ?? 'question_bank',
        price: body.price ?? 0,
        currency: body.currency ?? 'USD',
        author_id: auth.user.id,
        thumbnail: body.thumbnail ?? null,
        screenshots: body.screenshots ?? [],
        organization_id: body.organizationId ?? auth.user.schoolId,
        status: 'draft',
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create listing', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create listing', details: String(error) },
      { status: 500 }
    )
  }
}
