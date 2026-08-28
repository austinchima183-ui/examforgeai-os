import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const productId = searchParams.get('productId')

  const purchaseStatusSchema = z.object({
    userId: z.string().uuid('Valid userId required'),
    productId: z.string().uuid('Valid productId required'),
  })
  const input = validateInput(purchaseStatusSchema, { userId, productId })
  if ('error' in input) return input.error

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  const { data } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  return NextResponse.json({ purchased: !!data })
}
