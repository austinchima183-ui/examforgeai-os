// ============================================================================
// MISSION 9+14 — TEACHER JOURNEY (video recorded)
// Login → Dashboard → Question Bank → Teacher tools → Grading →
// Feature isolation → Logout
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, logout, shot, collectConsoleErrors } from './helpers'

test.describe('Teacher Journey (full E2E, video recorded)', () => {
  test('login → dashboard → question bank → tools → grading → isolation → logout', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // ── 1. LOGIN ──
    await login(page, 'teacher')
    await page.waitForTimeout(2500)
    await shot(page, '02-teacher-dashboard')

    expect(page.url()).toContain('/dashboard/teacher')

    const mainContent = await page.locator('main').innerText()
    expect(mainContent.length).toBeGreaterThan(200)

    // ── 2. SIDEBAR + WORKSPACE ──
    const sidebar = page.locator('aside[aria-label="Main navigation"]')
    await expect(sidebar).toBeVisible()

    // Workspace switcher dropdown works
    const workspaceSwitcher = page.locator('button[aria-label*="Workspace"]').first()
    await workspaceSwitcher.click()
    await page.waitForTimeout(600)
    await shot(page, '02-teacher-workspace-switcher')
    await page.keyboard.press('Escape')

    // ── 3. QUESTION BANK ──
    await page.goto('/question-bank', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '02-teacher-question-bank')

    // ── 4. TEACHER TOOLS ──
    const teacherPages = [
      '/teacher/lesson-planner',
      '/teacher/grading',
      '/teacher/ai-question-generator',
    ]
    for (const route of teacherPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }
    await shot(page, '02-teacher-ai-question-generator')

    // ── 5. ANALYTICS ──
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '02-teacher-analytics')

    // ── 6. EXAMS ──
    await page.goto('/exams', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '02-teacher-exams')

    // ── 7. FEATURE ISOLATION PROBES ──
    // Teacher must NEVER see student portal, parent portal, admin, super-admin
    const deniedProbes = [
      '/dashboard/student',
      '/dashboard/school-admin',
      '/dashboard/super-admin',
      '/admin/users',
      '/parent/child-progress',
      '/parent/fees',
      '/government',
      '/student/practice',
    ]
    for (const route of deniedProbes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const pathname = new URL(page.url()).pathname
      const stillOnDeniedRoute = pathname === route || pathname.startsWith(route + '/')
      expect(
        stillOnDeniedRoute,
        `Teacher should be redirected away from ${route} but stayed at ${pathname}`
      ).toBe(false)
    }
    await shot(page, '02-teacher-isolation-verified')

    // ── 8. LOGOUT ──
    await logout(page)
    await page.waitForTimeout(1500)
    await shot(page, '02-teacher-logged-out')

    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })
})
