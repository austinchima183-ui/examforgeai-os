// ============================================================================
// MISSION 9+14 — PARENT JOURNEY (video recorded)
// Login → Parent Dashboard → Child Progress → Attendance → Fees →
// Messaging → Feature isolation → Logout
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, logout, shot, collectConsoleErrors } from './helpers'

test.describe('Parent Journey (full E2E, video recorded)', () => {
  test('login → parent dashboard → child progress → attendance → fees → messaging → isolation → logout', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // ── 1. LOGIN ──
    await login(page, 'parent')
    await page.waitForTimeout(2500)
    await shot(page, '03-parent-dashboard')

    // CRITICAL: Parent must land on /parent/dashboard (NOT student dashboard)
    expect(page.url()).toContain('/parent/dashboard')

    const mainContent = await page.locator('main').innerText()
    expect(mainContent.length).toBeGreaterThan(200)

    // ── 2. CHILD PROGRESS ──
    await page.goto('/parent/child-progress', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '03-parent-child-progress')

    // ── 3. ATTENDANCE ──
    await page.goto('/parent/attendance', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '03-parent-attendance')

    // ── 4. FEES ──
    await page.goto('/parent/fees', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '03-parent-fees')

    // ── 5. MESSAGING ──
    await page.goto('/parent/messaging', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '03-parent-messaging')

    // ── 6. AI ADVISOR ──
    await page.goto('/parent/ai-advisor', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '03-parent-ai-advisor')

    // ── 7. FEATURE ISOLATION PROBES ──
    // Parent must NEVER see admin/teacher tools, school management, other parents' data
    const deniedProbes = [
      '/dashboard/teacher',
      '/dashboard/school-admin',
      '/dashboard/super-admin',
      '/admin/users',
      '/teachers',
      '/students',
      '/question-bank',
      '/analytics',
      '/school/fees',
      '/government',
    ]
    for (const route of deniedProbes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const pathname = new URL(page.url()).pathname
      const stillOnDeniedRoute = pathname === route || pathname.startsWith(route + '/')
      expect(
        stillOnDeniedRoute,
        `Parent should be redirected away from ${route} but stayed at ${pathname}`
      ).toBe(false)
    }
    await shot(page, '03-parent-isolation-verified')

    // ── 8. LOGOUT ──
    await logout(page)
    await page.waitForTimeout(1500)
    await shot(page, '03-parent-logged-out')

    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })
})
