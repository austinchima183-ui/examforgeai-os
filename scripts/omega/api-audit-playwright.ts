// ============================================================================
// OMEGA AUDIT — Authenticated API audit via real UI login (cookie session)
// Logs in as each of the 5 roles through the actual /login page, then probes
// every key API with the browser's cookie session. Saves JSON + console report.
// ============================================================================
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'http://localhost:3000'

const TEST_USERS = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
}

const ENDPOINTS: Record<string, string[]> = {
  student: [
    '/api/health', '/api/student/dashboard', '/api/student/exams', '/api/student/results',
    '/api/ai/student', '/api/notifications', '/api/student/study-plan', '/api/student/flashcards',
  ],
  teacher: [
    '/api/teacher/dashboard', '/api/teacher/classes', '/api/teacher/exams', '/api/teacher/questions',
    '/api/teacher/students', '/api/ai/teacher', '/api/teacher/lesson-plans', '/api/teacher/analytics',
  ],
  parent: [
    '/api/parent/dashboard', '/api/parent/children', '/api/parent/results', '/api/ai/parent', '/api/notifications',
  ],
  school_admin: [
    '/api/school/dashboard', '/api/school/students', '/api/school/teachers', '/api/school/classes',
    '/api/school/subjects', '/api/ai/school-admin', '/api/school/attendance', '/api/school/analytics',
    '/api/billing/invoices', '/api/marketplace/products',
  ],
  super_admin: [
    '/api/admin/dashboard', '/api/admin/organizations', '/api/admin/users', '/api/admin/audit-logs',
    '/api/admin/subscriptions', '/api/ai/predictive', '/api/admin/system-health',
  ],
}

async function login(page, creds) {
  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await email.fill(creds.email)
  await page.locator('input[placeholder="Enter your password"]').first().fill(creds.password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
}

;(async () => {
  const browser = await chromium.launch()
  const results: Record<string, Record<string, unknown>> = {}
  let total = 0, passed = 0

  for (const [role, creds] of Object.entries(TEST_USERS)) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    results[role] = {}
    try {
      await login(page, creds)
      console.log(`── ${role} (login OK → ${page.url()}) ──`)
      results[role]['__login'] = { ok: true, url: page.url() }
      for (const ep of ENDPOINTS[role]) {
        let status = 0, body = ''
        try {
          const res = await page.request.get(TARGET + ep, { timeout: 25000 })
          status = res.status()
          body = (await res.text()).slice(0, 200)
        } catch (e: any) {
          body = String(e).slice(0, 150)
        }
        const ok = status >= 200 && status < 300
        total++; if (ok) passed++
        results[role][ep] = { status, ok, body: ok ? undefined : body }
        console.log(`  ${ok ? '✓' : '✗'} ${status} ${ep}${ok ? '' : ' — ' + body.slice(0, 100)}`)
      }
    } catch (e: any) {
      results[role]['__login'] = { ok: false, error: String(e).slice(0, 200) }
      console.log(`── ${role} LOGIN FAILED: ${String(e).slice(0, 150)}`)
    }
    await ctx.close()
  }

  await browser.close()
  console.log(`\n═══ SUMMARY: ${passed}/${total} authenticated API checks passed ═══`)
  fs.mkdirSync('download/verification/audit', { recursive: true })
  fs.writeFileSync('download/verification/audit/api-audit-cookie.json',
    JSON.stringify({ target: TARGET, results, summary: { passed, total } }, null, 2))
  console.log('Saved: download/verification/audit/api-audit-cookie.json')
  process.exit(0)
})()
