// Verify all 5 role dashboards render with real content
const { chromium } = require('@playwright/test')

const ROLES = [
  ['student', 'prod-final-1787626351@examforge-test.com', 'SecurePass123!', '/dashboard/student'],
  ['teacher', 'e2e-teacher-1787626988@examforge-test.com', 'Teacher123!', '/dashboard/teacher'],
  ['parent', 'e2e-parent-1787626988@examforge-test.com', 'Parent123!', '/parent/dashboard'],
  ['school_admin', 'e2e-schooladmin-1787626988@examforge-test.com', 'SchoolAdmin123!', '/dashboard/school-admin'],
  ['super_admin', 'e2e-superadmin@examforge-test.com', 'SuperAdmin123!', '/dashboard/super-admin'],
]

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  let allOk = true

  for (const [role, email, pass, expectedPath] of ROLES) {
    const page = await browser.newPage()
    try {
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
      await page.fill('input[placeholder="you@school.edu"]', email)
      await page.fill('input[placeholder="Enter your password"]', pass)
      await page.click('button[type="submit"]:has-text("Sign In")')
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
      await page.waitForTimeout(3000)

      const url = page.url()
      const mainLen = await page.evaluate(() => document.querySelector('main')?.innerText?.length ?? 0)
      const hasError = await page.evaluate(() => document.querySelector('main')?.innerText?.includes('Something went wrong') ?? false)
      const sidebar = await page.evaluate(() => !!document.querySelector('aside[aria-label="Main navigation"]'))

      const onCorrectDashboard = url.includes(expectedPath)
      const ok = onCorrectDashboard && mainLen > 300 && !hasError && sidebar
      if (!ok) allOk = false
      console.log(`${ok ? '✓' : '✗'} ${role.padEnd(13)} url=${url.replace('http://localhost:3000', '').padEnd(28)} main=${String(mainLen).padStart(5)}ch sidebar=${sidebar} err=${hasError}`)
    } catch (e) {
      allOk = false
      console.log(`✗ ${role.padEnd(13)} FAILED: ${String(e).slice(0, 100)}`)
    }
    await page.close()
  }

  await browser.close()
  console.log(allOk ? '\nALL 5 DASHBOARDS OK' : '\nSOME DASHBOARDS FAILED')
  process.exit(allOk ? 0 : 1)
})()
