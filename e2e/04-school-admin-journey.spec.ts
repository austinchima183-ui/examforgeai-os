// ============================================================================
// MISSION 9+14 — SCHOOL ADMIN JOURNEY (video recorded)
// Login → Dashboard → Users → Teachers → Students → School management →
// Billing → Feature isolation → Logout
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, logout, shot, collectConsoleErrors } from './helpers'

test.describe('School Admin Journey (full E2E, video recorded)', () => {
  test('login → dashboard → users → school management → billing → isolation → logout', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // ── 1. LOGIN ──
    await login(page, 'school_admin')
    await page.waitForTimeout(2500)
    await shot(page, '04-school-admin-dashboard')

    expect(page.url()).toContain('/dashboard/school-admin')

    const mainContent = await page.locator('main').innerText()
    expect(mainContent.length).toBeGreaterThan(200)

    // ── 2. ADMIN USERS ──
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '04-school-admin-users')

    // ── 3. TEACHERS + STUDENTS ──
    await page.goto('/teachers', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '04-school-admin-teachers')

    await page.goto('/students', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '04-school-admin-students')

    // ── 4. SCHOOL MANAGEMENT ──
    const schoolPages = ['/school/classes', '/school/timetable', '/school/attendance', '/school/fees']
    for (const route of schoolPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
    }
    await shot(page, '04-school-admin-school-management')

    // ── 5. BILLING ──
    await page.goto('/billing', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '04-school-admin-billing')

    // ── 6. ANALYTICS ──
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '04-school-admin-analytics')

    // ── 7. FEATURE ISOLATION PROBES ──
    // School Admin must NEVER see super-admin-only areas or student learning tools
    const deniedProbes = [
      '/dashboard/super-admin',
      '/dashboard/student',
      '/admin/roles',
      '/admin/backups',
      '/admin/integrations',
      '/admin/organization-settings',
      '/government',
      '/student/practice',
      '/student/ai-tutor',
    ]
    for (const route of deniedProbes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const pathname = new URL(page.url()).pathname
      const stillOnDeniedRoute = pathname === route || pathname.startsWith(route + '/')
      expect(
        stillOnDeniedRoute,
        `School Admin should be redirected away from ${route} but stayed at ${pathname}`
      ).toBe(false)
    }
    await shot(page, '04-school-admin-isolation-verified')

    // ── 8. LOGOUT ──
    await logout(page)
    await page.waitForTimeout(1500)
    await shot(page, '04-school-admin-logged-out')

    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })
})
