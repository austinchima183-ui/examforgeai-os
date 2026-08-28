import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { createSafeErrorResponse } from '@/lib/api/auth-guard'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Demo Bookings API Route
// ============================================================================
// GET  /api/marketing/demos — Fetch all demo bookings (any authenticated user)
// POST /api/marketing/demos — Create demo booking (super_admin / school_admin only)
// ============================================================================

const ADMIN_ROLES = ['super_admin', 'school_admin'] as const

export async function GET() {
  try {
    const authResult = await getAuthUser()
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = authResult
    const { data, error } = await supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ demos: [], error: 'Failed to fetch demo bookings' }, { status: 500 })
    }

    return NextResponse.json({ demos: data || [] })
  } catch (err) {
    return NextResponse.json(
      { demos: [], ...createSafeErrorResponse(err) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await getAuthUser()
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Only admins can create demo bookings via this endpoint
    if (!ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number])) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Requires super_admin or school_admin role.' },
        { status: 403 }
      )
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({}).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    const { data, error } = await supabase
      .from('demo_bookings')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create demo booking' }, { status: 500 })
    }

    return NextResponse.json({ demo: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(createSafeErrorResponse(err), { status: 500 })
  }
}
