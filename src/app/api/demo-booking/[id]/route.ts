// ============================================================================
// ExamForge AI — Demo Booking [id] API Route (GET/PATCH/DELETE)
// ============================================================================
// All operations require authentication.
// Non-admin users can only access bookings they own (booked_by === user.id).
// Admins (super_admin, school_admin) can access any booking.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import type { UserRole } from '@/lib/types'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'

const ADMIN_ROLES: UserRole[] = ['super_admin', 'school_admin']

/**
 * Verify the authenticated user is allowed to operate on a given booking.
 * Admins can access any booking; non-admins must be the booking owner.
 */
function canModifyBooking(userRole: UserRole, userId: string, bookingBookedBy: string | null): boolean {
  if (ADMIN_ROLES.includes(userRole)) return true
  return bookingBookedBy === userId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser()
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const { id } = await params

    const { data: booking, error } = await supabase
      .from('demo_bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Ownership / role check
    if (!canModifyBooking(user.role, user.id, booking.booked_by)) {
      return NextResponse.json({ error: 'Forbidden — you do not own this booking' }, { status: 403 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('[Demo Booking GET] Error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser()
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const { id } = await params

    // Fetch existing booking first to verify ownership/role
    const { data: existing, error: fetchError } = await supabase
      .from('demo_bookings')
      .select('booked_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!canModifyBooking(user.role, user.id, existing.booked_by)) {
      return NextResponse.json({ error: 'Forbidden — you do not own this booking' }, { status: 403 })
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({}).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const allowedFields = ['status', 'assigned_to', 'meeting_url', 'notes', 'preferred_date', 'preferred_time', 'timezone']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: booking, error } = await supabase
      .from('demo_bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('[Demo Booking PATCH] Error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser()
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const { id } = await params

    // Fetch existing booking first to verify ownership/role
    const { data: existing, error: fetchError } = await supabase
      .from('demo_bookings')
      .select('booked_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!canModifyBooking(user.role, user.id, existing.booked_by)) {
      return NextResponse.json({ error: 'Forbidden — you do not own this booking' }, { status: 403 })
    }

    const { error } = await supabase
      .from('demo_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Demo Booking DELETE] Error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
