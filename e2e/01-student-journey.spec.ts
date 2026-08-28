// ============================================================================
// MISSION 9+14 — STUDENT JOURNEY (video recorded)
// Login → Dashboard → Sidebar interactions → Student tools → Notifications
// → Profile → Feature isolation probes → Logout
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, logout, shot, collectConsoleErrors } from './helpers'

test.describe('Student Journey (full E2E, video recorded)', () => {
  test('login → dashboard → sidebar → tools → notifications → logout', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // ── 1. LOGIN ──
    await login(page, 'student')
    await page.waitForTimeout(2500) // let dashboard widgets hydrate
    await shot(page, '01-student-dashboard')

    // Should land on student dashboard
    expect(page.url()).toContain('/dashboard/student')

    // Dashboard has real content (KPI cards / sections)
    const mainContent = await page.locator('main').innerText()
    expect(mainContent.length).toBeGreaterThan(200)

    // ── 2. SIDEBAR INTERACTIONS ──
    const sidebar = page.locator('aside[aria-label="Main navigation"]')
    await expect(sidebar).toBeVisible()

    // 2a. Workspace switcher present
    const workspaceSwitcher = page.locator('button[aria-label*="Workspace"]')
    expect(await workspaceSwitcher.count()).toBeGreaterThan(0)

    // 2b. Sidebar search
    const searchInput = page.locator('input[aria-label="Filter sidebar navigation"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('practice')
      await page.waitForTimeout(500)
      await shot(page, '01-student-sidebar-search')
      await searchInput.fill('')
    }

    // 2c. Collapse sidebar (⌘B)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(600)
    await shot(page, '01-student-sidebar-collapsed')

    // 2d. Expand sidebar back
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(600)

    // 2e. Command palette (⌘K)
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(800)
    await shot(page, '01-student-command-palette')
    await page.keyboard.press('Escape')

    // ── 3. STUDENT TOOLS ──
    const studentPages = [
      '/student/practice',
      '/student/progress',
      '/student/flashcards',
    ]
    for (const route of studentPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      const status = await page.evaluate(() => document.readyState)
      expect(status).toBe('complete')
    }
    await shot(page, '01-student-practice')

    // ── 4. RESULTS PAGE ──
    await page.goto('/results', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '01-student-results')

    // ── 5. NOTIFICATIONS ──
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '01-student-notifications')

    // ── 6. PROFILE ──
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await shot(page, '01-student-profile')

    // ── 7. FEATURE ISOLATION PROBES ──
    // Student must NEVER see admin/teacher/parent areas
    const deniedProbes = [
      '/dashboard/teacher',
      '/dashboard/school-admin',
      '/dashboard/super-admin',
      '/admin/users',
      '/teachers',
      '/question-bank',
      '/parent/child-progress',
    ]
    for (const route of deniedProbes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const pathname = new URL(page.url()).pathname
      const stillOnDeniedRoute = pathname === route || pathname.startsWith(route + '/')
      expect(
        stillOnDeniedRoute,
        `Student should be redirected away from ${route} but stayed at ${pathname}`
      ).toBe(false)
    }
    await shot(page, '01-student-isolation-verified')

    // ── 8. LOGOUT ──
    await logout(page)
    await page.waitForTimeout(1500)
    await shot(page, '01-student-logged-out')

    // Console error gate
    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })
})
