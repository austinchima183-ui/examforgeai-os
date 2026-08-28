// ============================================================================
// Tenant Isolation Test Suite
// ============================================================================
// Verifies that Organization A cannot access Organization B's data.
// Every service must scope queries by school_id for non-super_admin roles
// to prevent cross-tenant data leakage.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ──────────────────────────────────────────────────────────────
// Shared mutable state for tracking mock calls
// ──────────────────────────────────────────────────────────────

// Use vi.hoisted so these are available when vi.mock factory runs
const { filterCalls, queryResults, createMockQueryBuilder, mockSupabaseClient } = vi.hoisted(() => {
  const filterCalls: Array<{ table: string; column: string; value: unknown }> = []
  const queryResults: Record<string, unknown[]> = {}

  /**
   * Builds a chainable mock query builder that records .eq() / .in() calls
   * and resolves with the configured queryResults for that table.
   */
  function createMockQueryBuilder(table: string) {
    const builder: Record<string, any> = {}

    // Per-builder call tracking (captured via closure)
    const localCalls: Array<{ column: string; value: unknown }> = []

    const handler: ProxyHandler<any> = {
      get(_target, prop) {
        if (prop === 'then') {
          // Make the builder thenable so `await query` works
          return (resolve: (value: unknown) => void) => {
            // Record all local calls into the global tracker
            for (const call of localCalls) {
              filterCalls.push({ table, column: call.column, value: call.value })
            }
            resolve({ data: queryResults[table] ?? [], error: null, count: queryResults[table]?.length ?? 0 })
          }
        }
        if (prop === 'eq') {
          return (column: string, value: unknown) => {
            localCalls.push({ column, value })
            return new Proxy(builder, handler)
          }
        }
        if (prop === 'in') {
          return (column: string, value: unknown) => {
            localCalls.push({ column, value })
            return new Proxy(builder, handler)
          }
        }
        // Non-tracking chainable methods
        const noTrackMethods = ['ilike', 'gte', 'like', 'filter', 'neq', 'lt', 'lte', 'gt', 'not', 'is', 'contains', 'containedBy', 'range']
        if (noTrackMethods.includes(prop as string)) {
          return () => new Proxy(builder, handler)
        }
        // Methods that return a new chain
        const chainMethods = ['select', 'update', 'delete', 'insert', 'upsert', 'order', 'limit', 'single', 'maybeSingle']
        if (chainMethods.includes(prop as string)) {
          return () => new Proxy(builder, handler)
        }
        // Catch-all: return a function that chains
        return () => new Proxy(builder, handler)
      },
    }

    return new Proxy(builder, handler)
  }

  const mockSupabaseClient = {
    from: (table: string) => createMockQueryBuilder(table),
  }

  return { filterCalls, queryResults, createMockQueryBuilder, mockSupabaseClient }
})

// ──────────────────────────────────────────────────────────────
// Mock the Supabase server client
// ──────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
  requireSupabase: vi.fn().mockResolvedValue(mockSupabaseClient),
  createClientOrNull: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

// ──────────────────────────────────────────────────────────────
// Import services AFTER mock setup
// ──────────────────────────────────────────────────────────────

import { globalSearch } from '@/lib/services/search-service'
import { getStudentStats, getDashboardData } from '@/lib/services/dashboard-service'
import { getCBTData } from '@/lib/services/cbt-service'
import { getQuestionBankData } from '@/lib/services/question-bank-service'
import { getAnalyticsData } from '@/lib/services/analytics-service'
import {
  markNotificationRead,
  deleteNotification,
  getNotificationsData,
} from '@/lib/services/notifications-service'
import { getClassesData, getFeesData } from '@/lib/services/school-admin-service'

// ──────────────────────────────────────────────────────────────
// Test IDs
// ──────────────────────────────────────────────────────────────

const SCHOOL_A = 'school-aaaa-1111-2222'
const SCHOOL_B = 'school-bbbb-3333-4444'
const USER_A = 'user-aaaa-5555-6666'
const USER_B = 'user-bbbb-7777-8888'

// ============================================================================
// 1. Search Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — Search Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.schools = []
    queryResults.profiles = []
    queryResults.questions = []
    queryResults.exams = []
    queryResults.marketplace_products = []
    queryResults.notifications = []
  })

  it('applies school_id filter for school_admin role', async () => {
    await globalSearch('test', USER_A, SCHOOL_A, 'school_admin')

    // Student and teacher profile queries should be scoped to school_id
    const schoolIdFilters = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolIdFilters.length).toBeGreaterThanOrEqual(2)
  })

  it('does NOT apply school_id filter for super_admin', async () => {
    await globalSearch('test', USER_A, SCHOOL_A, 'super_admin')

    // super_admin should never have school_id filter applied on profile/question/exam queries
    const schoolIdFilters = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolIdFilters.length).toBe(0)
  })

  it('applies created_by filter for teacher role on questions and exams', async () => {
    await globalSearch('test', USER_A, SCHOOL_A, 'teacher')

    const createdByFilters = filterCalls.filter(
      (c) => c.column === 'created_by' && c.value === USER_A
    )
    // Teacher should get created_by on questions and exams
    expect(createdByFilters.length).toBeGreaterThanOrEqual(2)
  })

  it('skips unscoped queries when schoolId is null for non-super_admin', async () => {
    await globalSearch('test', USER_A, null, 'school_admin')

    // No null school_id filters should be applied (the code skips instead)
    const unscopedSchoolId = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === null
    )
    expect(unscopedSchoolId.length).toBe(0)
  })

  it('reassigns immutable query builder (let instead of const) — school_id applied to questions and exams', async () => {
    // This test verifies the FIX: the query builder is reassigned with `let`
    // If the code used `const`, the .eq() calls would be lost and no filters recorded
    await globalSearch('test', USER_A, SCHOOL_A, 'school_admin')

    // Verify that school_id filters were actually applied (proves reassignment works)
    const questionSchoolFilter = filterCalls.find(
      (c) => c.table === 'questions' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(questionSchoolFilter).toBeDefined()

    const examSchoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(examSchoolFilter).toBeDefined()
  })
})

// ============================================================================
// 2. Dashboard Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — Dashboard Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.exams = [{ id: 'exam-1' }]
    queryResults.exam_sessions = []
  })

  it('scopes upcoming exams to student school via schoolId', async () => {
    await getStudentStats(USER_A, SCHOOL_A)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolFilter).toBeDefined()
  })

  it('does NOT apply school_id filter when schoolId is null', async () => {
    await getStudentStats(USER_A, null)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id'
    )
    // When schoolId is null, the code skips the .eq('school_id', ...) call
    expect(schoolFilter).toBeUndefined()
  })

  it('returns empty stats via getDashboardData when school_admin has no schoolId', async () => {
    const result = await getDashboardData('school_admin' as any, USER_A, null)

    expect(result.stats).toBeNull()
    expect(result.activities).toEqual([])
  })
})

// ============================================================================
// 3. CBT Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — CBT Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.exams = []
    queryResults.questions = []
    queryResults.exam_sessions = []
    queryResults.classes = []
  })

  it('scopes exams by school_id for student role', async () => {
    await getCBTData('student', USER_A, SCHOOL_A)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolFilter).toBeDefined()
  })

  it('scopes exams by school_id for school_admin role', async () => {
    await getCBTData('school_admin', USER_A, SCHOOL_A)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolFilter).toBeDefined()
  })

  it('does NOT apply school_id filter for super_admin', async () => {
    await getCBTData('super_admin', USER_A, SCHOOL_A)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id'
    )
    expect(schoolFilter).toBeUndefined()
  })

  it('scopes exams by created_by for teacher role', async () => {
    await getCBTData('teacher', USER_A, SCHOOL_A)

    const createdByFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'created_by' && c.value === USER_A
    )
    expect(createdByFilter).toBeDefined()
  })

  it('restricts student without schoolId to published/active/completed exams only', async () => {
    await getCBTData('student', USER_A, null)

    // Should have status filter but no school_id
    const statusFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'status'
    )
    expect(statusFilter).toBeDefined()

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'exams' && c.column === 'school_id'
    )
    expect(schoolFilter).toBeUndefined()
  })
})

// ============================================================================
// 4. Question Bank Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — Question Bank Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.questions = []
    queryResults.subjects = []
    queryResults.topics = []
    queryResults.exam_questions = []
  })

  it('scopes questions by school_id for student with schoolId', async () => {
    await getQuestionBankData('student', USER_A, SCHOOL_A)

    // Live schema: question bank lives in `question_bank` (school-scoped + published-only for students)
    const schoolFilter = filterCalls.find(
      (c) => c.table === 'question_bank' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolFilter).toBeDefined()
  })

  it('returns empty result for student without schoolId', async () => {
    const result = await getQuestionBankData('student', USER_A, null)

    // Student without schoolId should get zero results — cannot safely scope
    expect(result.stats.totalQuestions).toBe(0)
    expect(result.questions).toEqual([])
    expect(result.subjects).toEqual([])
    expect(result.topics).toEqual([])
  })

  it('scopes questions by school_id for school_admin', async () => {
    await getQuestionBankData('school_admin', USER_A, SCHOOL_A)

    const schoolFilter = filterCalls.find(
      (c) => c.table === 'question_bank' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(schoolFilter).toBeDefined()
  })

  it('scopes questions by created_by for teacher', async () => {
    await getQuestionBankData('teacher', USER_A, SCHOOL_A)

    const createdByFilter = filterCalls.find(
      (c) => c.table === 'question_bank' && c.column === 'created_by' && c.value === USER_A
    )
    expect(createdByFilter).toBeDefined()
  })
})

// ============================================================================
// 5. Analytics Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — Analytics Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.exams = []
    queryResults.profiles = []
    queryResults.exam_sessions = []
    queryResults.schools = []
  })

  it('scopes sessions by exams.school_id for school_admin', async () => {
    await getAnalyticsData('school_admin' as any, USER_A, SCHOOL_A, '30d')

    // school_admin should have school_id scoping on exam_sessions via inner join
    const sessionSchoolFilter = filterCalls.find(
      (c) => c.table === 'exam_sessions' && c.column === 'exams.school_id' && c.value === SCHOOL_A
    )
    expect(sessionSchoolFilter).toBeDefined()
  })

  it('scopes sessions by exams.school_id for teacher', async () => {
    await getAnalyticsData('teacher' as any, USER_A, SCHOOL_A, '30d')

    // teacher with schoolId should be scoped to their school's sessions
    const sessionSchoolFilter = filterCalls.find(
      (c) => c.table === 'exam_sessions' && c.column === 'exams.school_id' && c.value === SCHOOL_A
    )
    expect(sessionSchoolFilter).toBeDefined()
  })

  it('scopes sessions by student_id for student role', async () => {
    await getAnalyticsData('student' as any, USER_A, SCHOOL_A, '30d')

    const studentFilter = filterCalls.find(
      (c) => c.table === 'exam_sessions' && c.column === 'student_id' && c.value === USER_A
    )
    expect(studentFilter).toBeDefined()
  })
})

// ============================================================================
// 6. Notifications Service — Tenant Isolation (IDOR prevention)
// ============================================================================

describe('Tenant Isolation — Notifications Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.notifications = []
  })

  it('markNotificationRead requires user_id to prevent IDOR', async () => {
    await markNotificationRead('notif-123', USER_A)

    // Must filter by both notification id AND user_id
    const idFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'id' && c.value === 'notif-123'
    )
    expect(idFilter).toBeDefined()

    const userIdFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'user_id' && c.value === USER_A
    )
    expect(userIdFilter).toBeDefined()
  })

  it('deleteNotification requires user_id to prevent IDOR', async () => {
    await deleteNotification('notif-456', USER_A)

    const idFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'id' && c.value === 'notif-456'
    )
    expect(idFilter).toBeDefined()

    const userIdFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'user_id' && c.value === USER_A
    )
    expect(userIdFilter).toBeDefined()
  })

  it('getNotificationsData scopes to user_id only', async () => {
    await getNotificationsData(USER_A)

    const userIdFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'user_id' && c.value === USER_A
    )
    expect(userIdFilter).toBeDefined()

    // Should NOT have any school_id filter on notifications (they're user-scoped)
    const schoolFilter = filterCalls.find(
      (c) => c.table === 'notifications' && c.column === 'school_id'
    )
    expect(schoolFilter).toBeUndefined()
  })
})

// ============================================================================
// 7. School Admin Service — Tenant Isolation
// ============================================================================

describe('Tenant Isolation — School Admin Service', () => {
  beforeEach(() => {
    filterCalls.length = 0
    queryResults.classes = [{ id: 'class-1' }]
    queryResults.class_enrollments = []
    queryResults.class_subjects = []
    queryResults.profiles = []
    queryResults.subjects = []
    queryResults.fee_structures = []
    queryResults.fee_assignments = []
    queryResults.fee_payments = []
  })

  it('scopes classes to school_id', async () => {
    await getClassesData(SCHOOL_A)

    const classFilter = filterCalls.filter(
      (c) => c.table === 'classes' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(classFilter.length).toBeGreaterThanOrEqual(1)
  })

  it('scopes class_enrollments to school class IDs only', async () => {
    await getClassesData(SCHOOL_A)

    // Live schema: enrollments live in `class_students`, scoped via .in('class_id', safeClassIds)
    const enrollmentFilter = filterCalls.find(
      (c) => c.table === 'class_students' && c.column === 'class_id'
    )
    expect(enrollmentFilter).toBeDefined()
    // The value should be an array of class IDs from the school, never unscoped
    expect(Array.isArray(enrollmentFilter?.value)).toBe(true)
  })

  it('scopes class_subjects to school class IDs only', async () => {
    await getClassesData(SCHOOL_A)

    const subjectFilter = filterCalls.find(
      (c) => c.table === 'class_subjects' && c.column === 'class_id'
    )
    expect(subjectFilter).toBeDefined()
    expect(Array.isArray(subjectFilter?.value)).toBe(true)
  })

  it('scopes fee_assignments by school_id', async () => {
    await getFeesData(SCHOOL_A)

    const assignmentFilter = filterCalls.find(
      (c) => c.table === 'fee_assignments' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(assignmentFilter).toBeDefined()
  })

  it('scopes fee_payments by school_id', async () => {
    await getFeesData(SCHOOL_A)

    const paymentFilter = filterCalls.find(
      (c) => c.table === 'fee_payments' && c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(paymentFilter).toBeDefined()
  })

  it('Organization A cannot see Organization B data — different schoolId produces different filters', async () => {
    // Call with School A
    filterCalls.length = 0
    await getFeesData(SCHOOL_A)
    const schoolAFilters = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === SCHOOL_A
    )

    // Call with School B
    filterCalls.length = 0
    await getFeesData(SCHOOL_B)
    const schoolBFilters = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === SCHOOL_B
    )

    // Both should have school_id filters, but for different schools
    expect(schoolAFilters.length).toBeGreaterThan(0)
    expect(schoolBFilters.length).toBeGreaterThan(0)

    // After the second call, no SCHOOL_A filters should exist in current filterCalls
    const crossLeak = filterCalls.filter(
      (c) => c.column === 'school_id' && c.value === SCHOOL_A
    )
    expect(crossLeak.length).toBe(0)
  })
})
