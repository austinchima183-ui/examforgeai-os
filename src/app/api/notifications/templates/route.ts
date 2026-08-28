import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiRole, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Notification Templates API
// ============================================================================
// CRUD for system notification templates with variable placeholders.
// Persists to Supabase notification_templates table (primary).
// On GET, DB rows are merged with defaults so new default templates
// appear alongside any customised DB-persisted versions.
// SECURITY: Requires super_admin or school_admin authentication.
// ============================================================================

interface Template {
  id: string
  key: string
  name: string
  subject: string
  body: string
  variables: string[]
  channel: string
  updatedAt: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    key: 'exam_assigned',
    name: 'Exam Assigned',
    subject: 'New Exam: {{exam_title}}',
    body: 'Hello {{student_name}},\n\nYou have been assigned a new exam: {{exam_title}}.\n\nExam Date: {{exam_date}}\nDuration: {{exam_duration}} minutes\nSubject: {{subject_name}}\n\nPlease prepare accordingly and arrive on time.\n\nBest regards,\n{{school_name}}',
    variables: ['student_name', 'exam_title', 'exam_date', 'exam_duration', 'subject_name', 'school_name'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-2',
    key: 'result_published',
    name: 'Result Published',
    subject: 'Your Results for {{exam_title}} are Available',
    body: 'Hello {{student_name}},\n\nYour results for {{exam_title}} have been published.\n\nScore: {{score}}/{{total_marks}}\nGrade: {{grade}}\nPercentage: {{percentage}}%\n\nView your detailed results on the platform.\n\nBest regards,\n{{school_name}}',
    variables: ['student_name', 'exam_title', 'score', 'total_marks', 'grade', 'percentage', 'school_name'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-3',
    key: 'payment_due',
    name: 'Payment Due',
    subject: 'Payment Reminder: {{invoice_amount}} Due',
    body: 'Hello {{parent_name}},\n\nThis is a reminder that a payment of {{invoice_amount}} is due for {{student_name}}.\n\nInvoice: {{invoice_number}}\nDue Date: {{due_date}}\nDescription: {{description}}\n\nPlease make payment before the due date to avoid late fees.\n\nBest regards,\n{{school_name}}',
    variables: ['parent_name', 'student_name', 'invoice_amount', 'invoice_number', 'due_date', 'description', 'school_name'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-4',
    key: 'welcome',
    name: 'Welcome',
    subject: 'Welcome to {{school_name}}!',
    body: 'Hello {{user_name}},\n\nWelcome to {{school_name}} on ExamForge AI!\n\nYour account has been set up with the role of {{role}}. You can now:\n\n- Access your dashboard\n- View upcoming exams\n- Check results and progress\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nThe {{school_name}} Team',
    variables: ['user_name', 'school_name', 'role'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-5',
    key: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset Your ExamForge AI Password',
    body: 'Hello {{user_name}},\n\nWe received a request to reset your password.\n\nClick the link below to set a new password:\n{{reset_link}}\n\nThis link expires in {{expiry_hours}} hours.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nExamForge AI Security',
    variables: ['user_name', 'reset_link', 'expiry_hours'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-6',
    key: 'attendance_alert',
    name: 'Attendance Alert',
    subject: 'Attendance Alert for {{student_name}}',
    body: 'Hello {{parent_name}},\n\nThis is an attendance alert for {{student_name}}.\n\nStatus: {{attendance_status}}\nDate: {{date}}\nClass: {{class_name}}\n\nCurrent attendance rate: {{attendance_rate}}%\n\nPlease ensure regular attendance for academic success.\n\nBest regards,\n{{school_name}}',
    variables: ['parent_name', 'student_name', 'attendance_status', 'date', 'class_name', 'attendance_rate', 'school_name'],
    channel: 'email',
    updatedAt: new Date().toISOString(),
  },
]

/** Map a DB row to the Template interface. */
function mapTemplateRow(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    subject: row.subject as string,
    body: row.body as string,
    variables: Array.isArray(row.variables) ? row.variables as string[] : [],
    channel: row.channel as string,
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  }
}

/** Get a Supabase client; returns null on failure. */
async function getSupabase() {
  try {
    return await createClient()
  } catch {
    return null
  }
}

/**
 * Merge DB-persisted templates with defaults.
 * DB rows override defaults with the same `key`; new defaults are added.
 */
function mergeWithDefaults(dbTemplates: Template[]): Template[] {
  const dbByKey = new Map(dbTemplates.map(t => [t.key, t]))
  const merged: Template[] = []

  // Start with all DB templates
  for (const t of dbTemplates) {
    merged.push(t)
  }

  // Add any defaults whose key is not yet present (new default templates)
  for (const def of DEFAULT_TEMPLATES) {
    if (!dbByKey.has(def.key)) {
      merged.push(def)
    }
  }

  return merged
}

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const sb = await getSupabase()
    if (sb) {
      const result = await sb
        .from('notification_templates')
        .select('*')
        .order('updated_at', { ascending: false })

      if (result.error) {
        console.error('Supabase notification_templates query error:', result.error)
      } else if (result.data) {
        const dbTemplates = result.data.map(mapTemplateRow)
        const merged = mergeWithDefaults(dbTemplates)
        return NextResponse.json({ templates: merged })
      }
    }

    // No DB available or query failed — return defaults
    return NextResponse.json({ templates: DEFAULT_TEMPLATES })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'getNotificationTemplates' }), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data as Record<string, unknown>
    const { id, subject, body: templateBody } = body

    const sb = await getSupabase()
    if (sb) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (subject) updateData.subject = subject
      if (templateBody) updateData.body = templateBody

      const result = await sb
        .from('notification_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (result.data) {
        return NextResponse.json({ template: mapTemplateRow(result.data as Record<string, unknown>) })
      }
      if (result.error) {
        console.error('Supabase notification_templates update error:', result.error)
        return NextResponse.json({ error: 'Failed to update template in database' }, { status: 500 })
      }
      // No row matched
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Database unavailable — cannot update template' }, { status: 503 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'updateNotificationTemplate' }), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data as Record<string, unknown>
    const { key, name, subject, body: templateBody, variables, channel } = body

    const sb = await getSupabase()
    if (sb) {
      const result = await sb
        .from('notification_templates')
        .insert({
          key: key as string,
          name: name as string,
          subject: subject as string,
          body: templateBody as string,
          variables: (variables as string[]) || [],
          channel: (channel as string) || 'email',
        })
        .select()
        .single()

      if (result.data) {
        return NextResponse.json({ template: mapTemplateRow(result.data as Record<string, unknown>) }, { status: 201 })
      }
      if (result.error) {
        console.error('Supabase notification_templates insert error:', result.error)
        return NextResponse.json({ error: 'Failed to create template in database' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Database unavailable — cannot create template' }, { status: 503 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'createNotificationTemplate' }), { status: 500 })
  }
}
