import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateId } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

// ============================================================================
// ExamForge AI — Parent Attendance API Route
// ============================================================================
// GET /api/parent/attendance — Attendance data for a child (parent/school_admin/super_admin)
// Child access is validated against the authenticated parent's linked children.
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: parent, school_admin, or super_admin
    const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive parentId from session
    const tenant = deriveTenantContext(auth)
    const parentId = tenant.userId

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    const month = searchParams.get('month') // YYYY-MM

    if (!childId) return NextResponse.json({ error: 'Child ID required' }, { status: 400 })

    // Validate childId format
    const childIdResult = validateId(childId, 'childId')
    if ('error' in childIdResult) return childIdResult.error

    // Verify this parent has access to this child
    const { data: parentChild, error: parentChildError } = await supabase
      .from('parent_children')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childIdResult.data)
      .limit(1)
      .maybeSingle()
    if (parentChildError) throw parentChildError
    // school_admin and super_admin can bypass parent-child check
    if (!parentChild && auth.user.role === 'parent') {
      return NextResponse.json({ error: 'You do not have access to this child' }, { status: 403 })
    }

    // Child lookup
    const { data: child, error: childError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', childIdResult.data)
      .maybeSingle()
    if (childError) throw childError
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

    // First class enrollment (Prisma classEnrollments[0] equivalent)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('class_students')
      .select('class_id, classes(id, name)')
      .eq('student_id', childIdResult.data)
      .limit(1)
      .maybeSingle()
    if (enrollmentError) throw enrollmentError

    // Date filter — attendance.date is a DATE column, so bounds are 'YYYY-MM-DD'
    // strings derived from the same local-calendar Dates the Prisma version used.
    let dateFilter: { gte?: string; lte?: string } = {}
    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59)
      dateFilter = { gte: toDateString(start), lte: toDateString(end) }
    } else {
      // Default: last 3 months
      const start = new Date()
      start.setMonth(start.getMonth() - 3)
      dateFilter = { gte: toDateString(start) }
    }

    let attendanceQuery = supabase
      .from('attendance')
      .select('*')
      .eq('student_id', childIdResult.data)
    if (dateFilter.gte) attendanceQuery = attendanceQuery.gte('date', dateFilter.gte)
    if (dateFilter.lte) attendanceQuery = attendanceQuery.lte('date', dateFilter.lte)

    const { data: attendanceRows, error: attendanceError } = await attendanceQuery.order('date', { ascending: false })
    if (attendanceError) throw attendanceError

    // Normalize rows to the original (Prisma camelCase) response shape
    const attendance = (attendanceRows ?? []).map(a => ({
      id: a.id,
      studentId: a.student_id,
      classId: a.class_id,
      date: a.date, // DATE column → 'YYYY-MM-DD' string
      status: a.status,
      reason: a.reason,
      markedBy: a.marked_by,
      createdAt: new Date(a.created_at).toISOString(),
    }))

    // Stats
    const total = attendance.length
    const present = attendance.filter(a => a.status === 'present').length
    const absent = attendance.filter(a => a.status === 'absent').length
    const late = attendance.filter(a => a.status === 'late').length
    const excused = attendance.filter(a => a.status === 'excused').length
    const attendanceRate = total > 0 ? ((present + late + excused) / total) * 100 : 100

    // Absence reasons
    const absenceReasons = attendance
      .filter(a => a.status === 'absent' && a.reason)
      .reduce((acc, a) => {
        acc[a.reason!] = (acc[a.reason!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Monthly breakdown
    const monthlyStats: Record<string, { total: number; present: number; absent: number; late: number }> = {}
    for (const a of attendance) {
      const key = String(a.date).slice(0, 7) // YYYY-MM
      if (!monthlyStats[key]) monthlyStats[key] = { total: 0, present: 0, absent: 0, late: 0 }
      monthlyStats[key].total++
      if (a.status === 'present') monthlyStats[key].present++
      if (a.status === 'absent') monthlyStats[key].absent++
      if (a.status === 'late') monthlyStats[key].late++
    }

    // Alerts
    const alerts: string[] = []
    if (attendanceRate < 85) alerts.push(`Attendance rate is ${attendanceRate.toFixed(0)}% — below the recommended 85%`)
    const consecutiveAbsences = findConsecutiveAbsences(attendance)
    if (consecutiveAbsences >= 3) alerts.push(`${consecutiveAbsences} consecutive absences detected — please provide explanation`)

    return NextResponse.json({
      child: { id: child.id, fullName: child.full_name },
      className: (enrollment?.classes as unknown as { name?: string } | undefined)?.name || 'Unassigned',
      attendance,
      stats: { total, present, absent, late, excused, attendanceRate },
      absenceReasons,
      monthlyStats,
      alerts,
    })
  } catch (error) {
    console.error('Attendance error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'parent/attendance' }), { status: 500 })
  }
}

/** Format a Date as a local-calendar 'YYYY-MM-DD' string (for DATE columns). */
function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function findConsecutiveAbsences(attendance: { status: string; date: string }[]): number {
  let maxConsecutive = 0
  let current = 0
  const sorted = [...attendance].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  for (const a of sorted) {
    if (a.status === 'absent') {
      current++
      maxConsecutive = Math.max(maxConsecutive, current)
    } else {
      current = 0
    }
  }
  return maxConsecutive
}
