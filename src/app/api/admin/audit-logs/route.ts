import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'

// GET /api/admin/audit-logs - List audit logs with filters (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  // SECURITY: Require super_admin authentication
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const entity = searchParams.get('entity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    // SECURITY: Enforce maximum limit to prevent table dumps
    const limit = Math.min(Math.max(rawLimit, 1), 100)
    const skip = (page - 1) * limit

    let listQuery = supabase.from('audit_logs').select('*')
    let countQuery = supabase.from('audit_logs').select('id', { count: 'exact', head: true })
    if (userId) {
      listQuery = listQuery.eq('user_id', userId)
      countQuery = countQuery.eq('user_id', userId)
    }
    if (action) {
      listQuery = listQuery.eq('action', action)
      countQuery = countQuery.eq('action', action)
    }
    if (entity) {
      listQuery = listQuery.eq('entity', entity)
      countQuery = countQuery.eq('entity', entity)
    }
    if (startDate) {
      const gte = new Date(startDate).toISOString()
      listQuery = listQuery.gte('created_at', gte)
      countQuery = countQuery.gte('created_at', gte)
    }
    if (endDate) {
      const lte = new Date(endDate).toISOString()
      listQuery = listQuery.lte('created_at', lte)
      countQuery = countQuery.lte('created_at', lte)
    }

    const [logsResult, countResult] = await Promise.all([
      listQuery.order('created_at', { ascending: false }).range(skip, skip + limit - 1),
      countQuery,
    ])

    if (logsResult.error) throw new Error(logsResult.error.message)
    if (countResult.error) throw new Error(countResult.error.message)

    const logs = logsResult.data ?? []
    const total = countResult.count ?? 0

    // Include actor profile (audit_logs.user_id has no FK to users — join manually)
    const actorIds = [...new Set(logs.map(l => l.user_id).filter((v): v is string => typeof v === 'string' && v !== null))]
    const usersById = new Map<string, { id: string; full_name: string | null; email: string | null; role: string | null }>()
    if (actorIds.length > 0) {
      const { data: actors, error: actorsError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('id', actorIds)
      if (actorsError) throw new Error(actorsError.message)
      for (const actor of actors ?? []) {
        usersById.set(actor.id, actor)
      }
    }

    const logsWithUser = logs.map(log => ({
      ...log,
      user: log.user_id ? usersById.get(log.user_id) ?? null : null,
    }))

    return NextResponse.json({ logs: toCamelRows(logsWithUser), total, page, limit })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
