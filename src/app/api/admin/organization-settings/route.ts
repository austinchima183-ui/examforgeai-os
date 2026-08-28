import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiRole, createSafeErrorResponse, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Organization Settings API
// ============================================================================
// CRUD for organization settings: branding, academic year, grading, feature flags.
// SECURITY: Requires super_admin or school_admin authentication.
// ============================================================================

interface OrganizationSettings {
  name: string
  logo: string | null
  primaryColor: string
  timezone: string
  academicYear: {
    startDate: string
    endDate: string
    terms: { name: string; startDate: string; endDate: string }[]
  }
  gradingSystem: {
    type: 'points' | 'percentage' | 'letter' | 'gpa'
    scale: { grade: string; minScore: number; maxScore: number; gpa: number }[]
  }
  featureFlags: {
    cbt?: boolean
    ai?: boolean
    marketplace?: boolean
    offline?: boolean
    parentPortal?: boolean
    multiSchool?: boolean
  }
  emailDomainRestriction: string | null
  dataRetentionDays: number
}

const DEFAULT_SETTINGS: OrganizationSettings = {
  name: 'ExamForge Academy',
  logo: null,
  primaryColor: '#10b981',
  timezone: 'Africa/Lagos',
  academicYear: {
    startDate: '2024-09-01',
    endDate: '2025-07-31',
    terms: [
      { name: 'First Term', startDate: '2024-09-01', endDate: '2024-12-20' },
      { name: 'Second Term', startDate: '2025-01-06', endDate: '2025-04-11' },
      { name: 'Third Term', startDate: '2025-04-28', endDate: '2025-07-31' },
    ],
  },
  gradingSystem: {
    type: 'letter',
    scale: [
      { grade: 'A+', minScore: 90, maxScore: 100, gpa: 4.0 },
      { grade: 'A', minScore: 80, maxScore: 89, gpa: 3.7 },
      { grade: 'B+', minScore: 75, maxScore: 79, gpa: 3.3 },
      { grade: 'B', minScore: 70, maxScore: 74, gpa: 3.0 },
      { grade: 'C+', minScore: 65, maxScore: 69, gpa: 2.7 },
      { grade: 'C', minScore: 60, maxScore: 64, gpa: 2.0 },
      { grade: 'D', minScore: 50, maxScore: 59, gpa: 1.0 },
      { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0 },
    ],
  },
  featureFlags: {
    cbt: true,
    ai: true,
    marketplace: true,
    offline: false,
    parentPortal: true,
    multiSchool: true,
  },
  emailDomainRestriction: null,
  dataRetentionDays: 365,
}

// In-memory store
let settings = { ...DEFAULT_SETTINGS }

// Proper schema for organization settings updates (replaces z.any() passthrough)
const organizationSettingsUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logo: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  timezone: z.string().max(100).optional(),
  academicYear: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    terms: z.array(z.object({
      name: z.string().max(100),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })),
  }).optional(),
  gradingSystem: z.object({
    type: z.enum(['points', 'percentage', 'letter', 'gpa']),
    scale: z.array(z.object({
      grade: z.string().max(10),
      minScore: z.number().min(0).max(100),
      maxScore: z.number().min(0).max(100),
      gpa: z.number().min(0).max(4),
    })),
  }).optional(),
  featureFlags: z.object({
    cbt: z.boolean().optional(),
    ai: z.boolean().optional(),
    marketplace: z.boolean().optional(),
    offline: z.boolean().optional(),
    parentPortal: z.boolean().optional(),
    multiSchool: z.boolean().optional(),
  }).optional(),
  emailDomainRestriction: z.string().max(200).nullable().optional(),
  dataRetentionDays: z.number().int().min(1).max(3650).optional(),
}).strict()

export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  try {
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'getOrganizationSettings' }), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  // CSRF guard
  const csrfOrg = enforceCsrf(request, auth)
  if (csrfOrg) return csrfOrg

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(organizationSettingsUpdateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    // Merge updates into settings
    settings = { ...settings, ...body }
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'updateOrganizationSettings' }), { status: 500 })
  }
}
