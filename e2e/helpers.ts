// ============================================================================
// ExamForge AI Ω — E2E Test Helpers
// Shared login + verification utilities for all role journeys
// ============================================================================

import { Page, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const TEST_USERS = {
  student: {
    email: 'prod-final-1787626351@examforge-test.com',
    password: 'SecurePass123!',
    dashboard: '/dashboard/student',
    label: 'Student',
  },
  teacher: {
    email: 'e2e-teacher-1787626988@examforge-test.com',
    password: 'Teacher123!',
    dashboard: '/dashboard/teacher',
    label: 'Teacher',
  },
  parent: {
    email: 'e2e-parent-1787626988@examforge-test.com',
    password: 'Parent123!',
    dashboard: '/parent/dashboard',
    label: 'Parent',
  },
  school_admin: {
    email: 'e2e-schooladmin-1787626988@examforge-test.com',
    password: 'SchoolAdmin123!',
    dashboard: '/dashboard/school-admin',
    label: 'School Admin',
  },
  super_admin: {
    email: 'e2e-superadmin@examforge-test.com',
    password: 'SuperAdmin123!',
    dashboard: '/dashboard/super-admin',
    label: 'Super Admin',
  },
} as const

export type RoleKey = keyof typeof TEST_USERS

// ── Login through the real UI (records in video) ──
export async function login(page: Page, role: RoleKey) {
  const user = TEST_USERS[role]
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1000) // hydration
  await emailInput.fill(user.email)

  await page.fill('input[placeholder="Enter your password"]', user.password)
  await page.click('button[type="submit"]:has-text("Sign In")')

  // Wait for redirect to role dashboard
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 45_000 }
  )

  // Dismiss onboarding wizard if it appears (defensive — DB flag should prevent it)
  const onboardingDialog = page.locator('div[role="dialog"][aria-label*="onboarding" i]')
  if (await onboardingDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const getStarted = onboardingDialog.locator('button:has-text("Get Started")')
    if (await getStarted.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await getStarted.click().catch(() => {})
      await page.waitForTimeout(800)
    }
    // close any remaining dialog (X / Skip)
    const closeBtn = onboardingDialog.locator('button[aria-label*="close" i], button:has-text("Skip"), button:has-text("Finish")').first()
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click().catch(() => {})
    }
    await page.waitForTimeout(500)
  }

  await expect(page.locator('body')).toBeVisible()
}

// ── Logout ──
export async function logout(page: Page) {
  // Try user menu → logout, fallback to direct navigation
  try {
    const userMenu = page.locator('button[aria-label*="menu" i], button[aria-label*="account" i], button[aria-label*="profile" i]').first()
    await userMenu.click({ timeout: 5_000 })
    const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Log out"), [data-testid="logout"]').first()
    await logoutBtn.click({ timeout: 5_000 })
    await page.waitForURL((url) => url.pathname === '/login' || url.pathname === '/', { timeout: 20_000 })
  } catch {
    await page.goto('/logout', { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
}

// ── Screenshot helper — saves to download/verification/screenshots ──
const SHOT_DIR = 'download/verification/screenshots'
export async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: false,
  })
}

// ── Collect console errors (excluding benign noise) ──
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 200)}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore network noise from third-party / expected auth 401s
      if (
        text.includes('net::ERR') ||
        text.includes('Failed to load resource') ||
        text.includes('401') ||
        text.includes('403') ||
        text.includes('favicon')
      ) return
      errors.push(`console.error: ${text.slice(0, 200)}`)
    }
  })
  return errors
}

// ── Feature isolation check ──
// Visit a route that this role should NOT access; expect redirect away from it
export async function expectRedirectedAway(page: Page, deniedRoute: string, allowedPrefix: string) {
  await page.goto(deniedRoute, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const url = page.url()
  const pathname = new URL(url).pathname
  const redirected = pathname.startsWith(allowedPrefix) || pathname === '/forbidden'
  return {
    route: deniedRoute,
    finalPath: pathname,
    isolated: redirected,
  }
}
