// ============================================================================
// PHASE Ω FINALIZATION — UPGRADED-SURFACE SWEEP
// Visits every mission-listed upgraded surface as the correct role and
// verifies: correct route (no redirect away), real rendered content (no 404),
// zero console errors. Saves per-surface verdicts + screenshots.
// ============================================================================
import { chromium } from '@playwright/test'
import * as fs from 'fs'

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'
const OUT = "/home/z/my-project/download/verification/omega-local/surface-sweep.json"
const SHOTS = '/home/z/my-project/download/verification/screenshots'

const USERS: Record<string, { email: string; password: string }> = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
}

const SURFACES: Array<{ role: string; route: string; label: string }> = [
  // Student
  { role: 'student', route: '/dashboard/student', label: 'student-command-center' },
  { role: 'student', route: '/exams', label: 'student-exam-storefront' },
  { role: 'student', route: '/cbt', label: 'student-cbt-hub' },
  { role: 'student', route: '/student/ai-tutor', label: 'student-ai-tutor' },
  { role: 'student', route: '/student/certificates', label: 'student-certificates' },
  { role: 'student', route: '/student/progress', label: 'student-progress-achievements' },
  { role: 'student', route: '/results', label: 'student-results' },
  // Teacher
  { role: 'teacher', route: '/dashboard/teacher', label: 'teacher-dashboard' },
  { role: 'teacher', route: '/teacher/grading', label: 'teacher-grading-queue' },
  { role: 'teacher', route: '/teacher/ai-question-generator', label: 'teacher-ai-generator' },
  { role: 'teacher', route: '/analytics', label: 'teacher-analytics' },
  { role: 'teacher', route: '/cbt', label: 'teacher-exam-management' },
  // Super admin
  { role: 'super_admin', route: '/dashboard/super-admin', label: 'admin-dashboard' },
  { role: 'super_admin', route: '/admin/security', label: 'admin-security-dashboard' },
  { role: 'super_admin', route: '/admin/users', label: 'admin-user-management' },
]

async function login(page: any, role: string) {
  const u = USERS[role]
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[placeholder="you@school.edu"]').first().waitFor({ timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.locator('input[placeholder="you@school.edu"]').first().fill(u.email)
  await page.locator('input[placeholder="Enter your password"]').first().fill(u.password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url: URL) => !url.pathname.startsWith('/login'), { timeout: 45_000 })
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  fs.mkdirSync(SHOTS, { recursive: true })
  const results: Array<Record<string, unknown>> = []
  const contexts: Record<string, any> = {}

  for (const s of SURFACES) {
    if (!contexts[s.role]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      await login(page, s.role)
      await page.waitForTimeout(2000)
      contexts[s.role] = page
    }
    const page = contexts[s.role]
    const errors: string[] = []
    const handler = (msg: any) => {
      if (msg.type() === 'error') {
        const t = msg.text()
        if (t.includes('net::ERR') || t.includes('401') || t.includes('403') || t.includes('favicon')) return
        errors.push(t.slice(0, 160))
      }
    }
    page.on('console', handler)

    try {
      await page.goto(`${BASE}${s.route}`, { waitUntil: 'domcontentloaded' })
      // Wait for real streamed content
      let text = ''
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000)
        text = await page.locator('main').innerText().catch(() => '')
        if (text.trim().length > 100) break
      }
      const finalPath = new URL(page.url()).pathname
      const notFound =
        /404|page not found|this page could not/i.test(text) ||
        text.trim().length < 40
      const redirectedAway = finalPath !== s.route && !finalPath.startsWith(s.route)
      const verdict =
        !notFound && !redirectedAway && errors.length === 0 ? 'PASS' : 'FAIL'
      await page.screenshot({ path: `${SHOTS}/surface-${s.label}.png` })
      results.push({
        role: s.role,
        route: s.route,
        label: s.label,
        finalPath,
        contentChars: text.trim().length,
        notFound,
        redirectedAway,
        consoleErrors: errors,
        verdict,
      })
      console.log(
        `${verdict === 'PASS' ? '✓' : '✗'} [${s.role}] ${s.route} → ${finalPath} (${text.trim().length} chars, ${errors.length} console errors)`
      )
    } catch (err) {
      results.push({ role: s.role, route: s.route, label: s.label, verdict: 'FAIL', error: String(err).slice(0, 200) })
      console.log(`✗ [${s.role}] ${s.route} ERROR ${String(err).slice(0, 120)}`)
    }
    page.off('console', handler)
  }

  const pass = results.filter((r) => r.verdict === 'PASS').length
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, pass, fail: results.length - pass, results }, null, 2))
  console.log(`\nSURFACE SWEEP: ${pass}/${results.length} PASS`)
  await browser.close()
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
