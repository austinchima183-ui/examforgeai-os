import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'

// PostgREST many-to-one embeds return objects at runtime; the untyped
// supabase-js client infers them as arrays. This permissive row type
// restores accurate runtime shapes (verified against the live API).
type Row = Record<string, any>


// ============================================================================
// ExamForge AI — Parent Dashboard API Route
// ============================================================================
// GET /api/parent/dashboard — Parent dashboard data (parent/school_admin/super_admin)
// parentId is ALWAYS derived from the authenticated session — never from client input.
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

    // Derive parentId from session — NEVER from client query params
    const tenant = deriveTenantContext(auth)
    const parentId = tenant.userId

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Get all children linked to this parent
    const { data: parentChildrenRows__d, error: parentChildrenError } = await supabase
      .from('parent_children')
      .select(`
        id,
        parent_id,
        child_id,
        relationship,
        created_at,
        child:users!parent_children_child_id_fkey(id, full_name, email, school_id)
      `)
      .eq('parent_id', parentId)
    const parentChildrenRows = parentChildrenRows__d as unknown as Row[]
    if (parentChildrenError) throw parentChildrenError

    const children = []
    for (const pc of parentChildrenRows ?? []) {
      const child = pc.child

      // Exam results (chronological — mirrors the original relation load order).
      // exam_results has no FK to exams, so exams are resolved with a second query.
      const { data: resultRows__d, error: resultsError } = await supabase
        .from('exam_results')
        .select('id, exam_id, total_marks, total_possible, score_percentage, grade, created_at')
        .eq('student_id', pc.child_id)
        .order('created_at', { ascending: true })
      const resultRows = resultRows__d as unknown as Row[]
      if (resultsError) throw resultsError

      const examById = new Map<string, { title: string; subject: { name: string } | null }>()
      const examIds = [...new Set((resultRows ?? []).map(r => r.exam_id))]
      if (examIds.length > 0) {
        const { data: examRows__d, error: examsError } = await supabase
          .from('exams')
          .select('id, title, subjects(name)')
          .in('id', examIds)
        const examRows = examRows__d as unknown as Row[]
        if (examsError) throw examsError
        for (const e of examRows ?? []) {
          examById.set(e.id, { title: e.title, subject: e.subjects })
        }
      }

      // Normalize rows to the original (Prisma camelCase) shape.
      // percentage→score_percentage, score→total_marks, totalMarks→total_possible
      // (numeric columns come back as strings → wrapped in Number()).
      const examResults = (resultRows ?? []).map(r => {
        const exam = examById.get(r.exam_id)
        return {
          id: r.id,
          percentage: Number(r.score_percentage),
          score: Number(r.total_marks),
          totalMarks: Number(r.total_possible),
          grade: r.grade ?? null,
          exam: {
            title: exam?.title ?? '',
            subject: exam?.subject ?? null,
          },
        }
      })

      // Latest 30 attendance records
      const { data: attendanceRows__d, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('student_id', pc.child_id)
        .order('date', { ascending: false })
        .limit(30)
      const attendanceRows = attendanceRows__d as unknown as Row[]
      if (attendanceError) throw attendanceError

      // Fee payments with their fee records
      const { data: paymentRows__d, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id, fee_id, student_id, amount, status, payment_method, reference, paid_at, due_date, receipt_url, created_at, updated_at,
          fees(id, school_id, name, amount, fee_type, academic_session, term, due_date, description, is_active, created_at, updated_at)
        `)
        .eq('student_id', pc.child_id)
      const paymentRows = paymentRows__d as unknown as Row[]
      if (paymentsError) throw paymentsError

      // First class enrollment (Prisma classEnrollments[0] equivalent)
      const { data: enrollment__d, error: enrollmentError } = await supabase
        .from('class_students')
        .select('class_id, classes(id, name)')
        .eq('student_id', pc.child_id)
        .limit(1)
        .maybeSingle()
      const enrollment = enrollment__d as unknown as Row
      if (enrollmentError) throw enrollmentError

      const latestResults = examResults.slice(-10)
      const avgScore = latestResults.length > 0
        ? latestResults.reduce((sum, r) => sum + r.percentage, 0) / latestResults.length
        : 0

      const totalAttendance = (attendanceRows ?? []).length
      const presentDays = (attendanceRows ?? []).filter(a => a.status === 'present' || a.status === 'late').length
      const attendanceRate = totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 100

      const outstandingFees = (paymentRows ?? []).filter(fp => fp.status === 'pending' || fp.status === 'overdue')
      const totalOutstanding = outstandingFees.reduce((sum, fp) => sum + fp.amount, 0)

      const recentResults = latestResults.slice(-5).map(r => ({
        id: r.id,
        exam: r.exam.title,
        subject: r.exam.subject?.name ?? null,
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        grade: r.grade,
      }))

      // AI insight based on data
      const insights: string[] = []
      if (latestResults.length >= 2) {
        const recent = latestResults.slice(-3)
        const older = latestResults.slice(-6, -3)
        if (older.length > 0) {
          const recentAvg = recent.reduce((s, r) => s + r.percentage, 0) / recent.length
          const olderAvg = older.reduce((s, r) => s + r.percentage, 0) / older.length
          const diff = recentAvg - olderAvg
          if (diff < -10) {
            const worstSubject = recent.sort((a, b) => a.percentage - b.percentage)[0]
            insights.push(`Performance declining — ${worstSubject.exam.subject?.name || 'a subject'} score dropped ${Math.abs(diff).toFixed(0)}%. Consider extra tutoring.`)
          } else if (diff > 10) {
            insights.push(`Great improvement! Average score improved by ${diff.toFixed(0)}% recently.`)
          }
        }
      }
      if (attendanceRate < 85) {
        insights.push(`Attendance rate is ${attendanceRate.toFixed(0)}% — below recommended 85%. Frequent absences affect learning.`)
      }

      children.push({
        id: child.id,
        fullName: child.full_name,
        email: child.email,
        relationship: pc.relationship,
        className: enrollment?.classes?.name || 'Unassigned',
        classId: enrollment?.classes?.id,
        averageScore: avgScore,
        attendanceRate,
        totalOutstanding,
        recentResults,
        insights,
        upcomingExams: [], // Could be populated from exam schedule
      })
    }

    // Get recent notifications
    const { data: notificationRows__d, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', parentId)
      .order('created_at', { ascending: false })
      .limit(5)
    const notificationRows = notificationRows__d as unknown as Row[]
    if (notificationsError) throw notificationsError

    // Normalize rows to the original (Prisma camelCase) shape.
    // notifications.action_url is the Supabase analogue of the Prisma `link` column.
    const notifications = (notificationRows ?? []).map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read ?? false,
      link: n.action_url ?? null,
      createdAt: new Date(n.created_at).toISOString(),
    }))

    // Get recent messages
    const { data: messageRows__d, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, sender_id, recipient_id, school_id, subject, content, parent_id, is_read, attachment_url, attachment_name, created_at, updated_at,
        sender_id:users!messages_sender_id_fkey(id, full_name, role)
      `)
      .eq('recipient_id', parentId)
      .order('created_at', { ascending: false })
      .limit(5)
    const messageRows = messageRows__d as unknown as Row[]
    if (messagesError) throw messagesError

    const recentMessages = (messageRows ?? []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      schoolId: m.school_id,
      subject: m.subject,
      content: m.content,
      parentId: m.parent_id,
      isRead: m.is_read,
      attachmentUrl: m.attachment_url,
      attachmentName: m.attachment_name,
      createdAt: new Date(m.created_at).toISOString(),
      updatedAt: new Date(m.updated_at).toISOString(),
      sender: m.sender ? { id: m.sender.id, fullName: m.sender.full_name, role: m.sender.role } : null,
    }))

    return NextResponse.json({ children, notifications, recentMessages })
  } catch (error) {
    console.error('Parent dashboard error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'parent/dashboard' }), { status: 500 })
  }
}
