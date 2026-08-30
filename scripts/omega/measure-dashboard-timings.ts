// Ω-5: Real navigation timing metrics for authenticated dashboard pages
import { chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PAGES = [
  ['student', '/dashboard/student'],
  ['teacher', '/dashboard/teacher'],
  ['parent', '/parent/dashboard'],
  ['school-admin', '/dashboard/school-admin'],
  ['super-admin', '/dashboard/super-admin'],
]

const CREDS: Record<string, [string, string]> = {
  student: ['prod-final-1787626351@examforge-test.com', 'SecurePass123!'],
  teacher: ['e2e-teacher-1787626988@examforge-test.com', 'Teacher123!'],
  parent: ['e2e-parent-1787626988@examforge-test.com', 'Parent123!'],
  'school-admin': ['e2e-schooladmin-1787626988@examforge-test.com', 'SchoolAdmin123!'],
  'super-admin': ['e2e-superadmin@examforge-test.com', 'SuperAdmin123!'],
}

async function login(page: any, role: string) {
  const [email, password] = CREDS[role]
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill(email)
  await page.locator('input[placeholder="Enter your password"]').first().fill(password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) return
  }
  throw new Error(`login failed: ${role}`)
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const results: Record<string, Record<string, number>> = {}

  for (const [role, path] of PAGES) {
    const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await login(page, role)
    await page.waitForTimeout(2000)

    // Measure 2 loads (second = warm cache)
    const runs: Record<string, number>[] = []
    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(2500)
      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        return {
          ttfb: Math.round(nav.responseStart - nav.startTime),
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          load: Math.round(nav.loadEventEnd),
          fcp: Math.round(paint.find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0),
        }
      })
      runs.push(timing)
    }
    results[`${role}${path}`] = {
      ttfb: runs[1].ttfb,
      fcp: runs[1].fcp,
      domContentLoaded: runs[1].domContentLoaded,
      load: runs[1].load,
    }
    await context.close()
    console.log(`${role}: TTFB ${runs[1].ttfb}ms · FCP ${runs[1].fcp}ms · DCL ${runs[1].domContentLoaded}ms · load ${runs[1].load}ms`)
  }

  const fs = await import('fs')
  fs.writeFileSync(
    'download/verification/omega-local/dashboard-nav-timings.json',
    JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, warmCache: results }, null, 2)
  )
  console.log('saved timings')
  await browser.close()
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
