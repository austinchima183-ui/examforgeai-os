import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { getAuthUser } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  // ── Identity from session (Ω-18: userId param was client-controlled —
  // an IDOR letting anyone probe other users' purchase records) ──
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = auth.user.id

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
