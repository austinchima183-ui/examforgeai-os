// ============================================================================
// MISSION 9+14 — SUPER ADMIN JOURNEY (video recorded)
// Login → Dashboard → Schools → System → Admin console → Government →
// Feature isolation → Logout
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, logout, shot, collectConsoleErrors } from './helpers'

test.describe('Super Admin Journey (full E2E, video recorded)', () => {
  test('login → dashboard → schools → admin console → government → isolation → logout', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // ── 1. LOGIN ──
    await login(page, 'super_admin')
    await page.waitForTimeout(2500)
    await shot(page, '05-super-admin-dashboard')

    expect(page.url()).toContain('/dashboard/super-admin')

    const mainContent = await page.locator('main').innerText()
    expect(mainContent.length).toBeGreaterThan(200)

    // ── 2. SCHOOLS (tenant registry) ──
    await page.goto('/schools', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '05-super-admin-schools')

    // ── 3. ADMIN CONSOLE ──
    const adminPages = ['/admin/users', '/admin/roles', '/admin/audit-logs', '/admin/security']
    for (const route of adminPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
    }
    await shot(page, '05-super-admin-admin-console')

    // ── 4. GOVERNMENT PORTAL ──
    await page.goto('/government', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '05-super-admin-government')

    // ── 5. WORKFLOWS ──
    await page.goto('/workflows', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '05-super-admin-workflows')

    // ── 6. FEATURE ISOLATION PROBES ──
    // Super Admin has broad access but must still NOT access student-only learning tools
    const deniedProbes = [
      '/student/practice',
      '/student/flashcards',
      '/student/ai-tutor',
      '/student/study-planner',
      '/student/progress',
      '/student/explain',
    ]
    for (const route of deniedProbes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const pathname = new URL(page.url()).pathname
      const stillOnDeniedRoute = pathname === route || pathname.startsWith(route + '/')
      expect(
        stillOnDeniedRoute,
        `Super Admin should be redirected away from ${route} but stayed at ${pathname}`
      ).toBe(false)
    }
    await shot(page, '05-super-admin-isolation-verified')

    // ── 7. LOGOUT ──
    await logout(page)
    await page.waitForTimeout(1500)
    await shot(page, '05-super-admin-logged-out')

    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })
})
