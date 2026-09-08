// ============================================================================
// ExamForge AI — Route-to-Role RBAC Map (Single Source of Truth)
// ============================================================================
// Centralized route-to-role mapping used by both middleware.ts (edge runtime)
// and require-auth.ts (server runtime). All RBAC route entries must be
// registered here. DEFAULT DENY: unmapped routes are NOT accessible.
// ============================================================================

import type { UserRole } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Public routes (no auth required)
// ──────────────────────────────────────────────────────────────

export const PUBLIC_ROUTES = [
  // Marketing pages (public landing site)
  '/',
  '/pricing',
  '/about',
  '/features',
  '/solutions',
  '/contact',
  '/docs',
  '/api-docs',
  '/blog',
  '/changelog',
  '/careers',
  '/status',
  '/customers',
  '/case-studies',
  '/integrations',
  '/partners',
  '/security',
  '/privacy',
  '/terms',
  '/cookies',
  '/gdpr',
  '/help-center',
  '/community',
  '/press-kit',
  '/developers',
  '/demo',
  '/documentation',
  // Auth pages
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  // Public certificate verification (anyone with a code — no account)
  '/verify/certificate',
  // API routes
  '/api/auth/callback',
  '/api/billing/webhook',
  '/api/billing/webhooks',
] as const

// ──────────────────────────────────────────────────────────────
// Route-to-Role Access Map
// ──────────────────────────────────────────────────────────────

export const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  // Dashboard routes
  '/dashboard/super-admin': ['super_admin'],
  '/dashboard/school-admin': ['school_admin', 'super_admin'],
  '/dashboard/teacher': ['teacher', 'school_admin', 'super_admin'],
  '/dashboard/student': ['student', 'parent'],
  '/dashboard': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],

  // Core routes
  '/schools': ['super_admin', 'school_admin'],
  '/billing': ['super_admin', 'school_admin'],
  '/billing/enterprise': ['school_admin', 'super_admin'],
  '/analytics': ['super_admin', 'school_admin', 'teacher'],
  '/analytics/enterprise': ['school_admin', 'super_admin'],
  '/reports': ['super_admin', 'school_admin', 'teacher'],
  '/question-bank': ['teacher', 'school_admin', 'super_admin'],
  '/cbt': ['teacher', 'school_admin', 'super_admin', 'student'],
  '/exams': ['teacher', 'school_admin', 'super_admin', 'student', 'parent'],
  '/forbidden': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  '/marketplace': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/results': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/students': ['super_admin', 'school_admin', 'teacher'],
  '/teachers': ['super_admin', 'school_admin'],
  '/parents': ['super_admin', 'school_admin'],
  '/search': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/settings': ['super_admin', 'school_admin', 'teacher', 'student'],
  '/profile': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  '/notifications': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],

  // Marketing (internal CRM — school staff)
  '/marketing': ['school_admin', 'super_admin'],

  // School management pages
  '/school/classes': ['school_admin', 'super_admin'],
  '/school/timetable': ['school_admin', 'super_admin'],
  '/school/attendance': ['school_admin', 'super_admin'],
  '/school/fees': ['school_admin', 'super_admin'],
  '/school/calendar': ['school_admin', 'super_admin'],
  '/school/settings': ['school_admin', 'super_admin'],

  // School admin AI tools
  '/school-admin/ai-insights': ['school_admin', 'super_admin'],
  '/school-admin/predictive': ['school_admin', 'super_admin'],

  // Admin pages (granular RBAC)
  '/admin': ['super_admin', 'school_admin'],
  '/admin/users': ['super_admin', 'school_admin'],
  '/admin/roles': ['super_admin'],
  '/admin/audit-logs': ['super_admin', 'school_admin'],
  '/admin/backups': ['super_admin'],
  '/admin/integrations': ['super_admin'],
  '/admin/organization-settings': ['super_admin'],
  '/admin/branding': ['super_admin', 'school_admin'],
  '/admin/organizations': ['super_admin'],
  '/admin/agents': ['super_admin'],
  '/admin/plugins': ['super_admin'],
  '/admin/developers': ['super_admin'],
  '/admin/security': ['super_admin'],

  // Teacher tools
  '/teacher': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/lesson-planner': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/worksheet-builder': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/rubric-builder': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/grading': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/content-assistant': ['teacher', 'school_admin', 'super_admin'],
  '/teacher/ai-question-generator': ['teacher', 'school_admin', 'super_admin'],

  // Student tools
  '/student': ['student', 'parent'],
  '/student/practice': ['student', 'parent'],
  '/student/flashcards': ['student', 'parent'],
  '/student/ai-tutor': ['student', 'parent'],
  '/student/study-planner': ['student', 'parent'],
  '/student/progress': ['student', 'parent'],
  '/student/explain': ['student', 'parent'],
  '/student/certificates': ['student', 'school_admin', 'super_admin'],
  '/student/revision-hub': ['student', 'school_admin', 'super_admin'],

  // Parent portal
  '/parent': ['parent', 'school_admin', 'super_admin'],
  '/parent/dashboard': ['parent', 'school_admin', 'super_admin'],
  '/parent/child-progress': ['parent', 'school_admin', 'super_admin'],
  '/parent/messaging': ['parent', 'school_admin', 'super_admin'],
  '/parent/attendance': ['parent', 'school_admin', 'super_admin'],
  '/parent/fees': ['parent', 'school_admin', 'super_admin'],
  '/parent/ai-advisor': ['parent', 'school_admin', 'super_admin'],

  // Government portal
  '/government': ['super_admin'],
  '/government/district-intelligence': ['super_admin'],

  // Workflows
  '/workflows': ['school_admin', 'super_admin'],
  '/workflows/[id]': ['school_admin', 'super_admin'],
}

// ──────────────────────────────────────────────────────────────
// Role Dashboard Map
// ──────────────────────────────────────────────────────────────

export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  student: '/dashboard/student',
  parent: '/parent/dashboard',
  teacher: '/dashboard/teacher',
  school_admin: '/dashboard/school-admin',
  super_admin: '/dashboard/super-admin',
}
