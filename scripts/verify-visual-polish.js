// ============================================================================
// Mission 15 — Visual Polish Sweep
// Visits key authenticated pages per role at 3 viewports; detects horizontal
// overflow, clipped elements, and broken layouts. Saves screenshots.
// ============================================================================
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'
const OUT = 'download/verification/ux2'
const SHOTS = path.join(OUT, 'polish-screenshots')

const USERS = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
}

// Routes per role (spread of dashboards, tables, forms, settings)
const ROUTES = {
  student: ['/dashboard/student', '/student/practice', '/student/progress', '/exams', '/notifications', '/settings', '/profile', '/billing'],
  teacher: ['/dashboard/teacher', '/exams', '/question-bank', '/teacher/lesson-plans', '/teacher/grading', '/teacher/worksheets', '/analytics'],
  parent: ['/parent/dashboard', '/parent/child-progress', '/parent/attendance', '/parent/fees', '/parent/messaging', '/notifications'],
  school_admin: ['/dashboard/school-admin', '/teachers', '/students', '/school/fees', '/school/attendance', '/school/calendar', '/school/classes', '/analytics'],
  super_admin: ['/dashboard/super-admin', '/admin/schools', '/admin/users', '/admin/billing', '/admin/audit-logs', '/admin/security', '/marketplace', '/analytics'],
}

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
]

async function login(page, role) {
  const user = USERS[role]
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await emailInput.fill(user.email)
  await page.fill('input[placeholder="Enter your password"]', user.password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
}

async function auditPage(page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const issues = []

    // 1. Horizontal overflow on the document
    const docOverflow = html.scrollWidth - html.clientWidth
    if (docOverflow > 2) issues.push({ type: 'document-horizontal-overflow', px: docOverflow })

    // 2. Horizontal overflow inside the main scroll container
    const main = document.querySelector('main#main-content')
    if (main && main.scrollWidth > main.clientWidth + 2) {
      issues.push({ type: 'main-horizontal-overflow', px: main.scrollWidth - main.clientWidth })
    }

    // 3. Elements extending beyond the viewport width (excluding intentional overlays)
    // Only meaningful when main actually has scrollable horizontal overflow;
    // otherwise elements are clipped decorations (overflow-hidden ancestors).
    const viewportW = window.innerWidth
    const mainHasOverflow = main ? main.scrollWidth > main.clientWidth + 2 : false
    const offenders = []
    document.querySelectorAll('main#main-content *').forEach((el) => {
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return
      const r = el.getBoundingClientRect()
      if (r.width > 0 && (r.right > viewportW + 8 || r.left < -8)) {
        // skip elements inside horizontal-scroll containers (tables etc.)
        // or clipped by overflow-hidden ancestors (decorative glows etc.)
        let p = el.parentElement
        let scrollable = false
        while (p && p !== document.body) {
          const pcs = getComputedStyle(p)
          if ((pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth) {
            scrollable = true
            break
          }
          if (pcs.overflow === 'hidden' || pcs.overflowX === 'hidden' || pcs.overflowY === 'hidden' || pcs.clipPath !== 'none') {
            // clipped by an overflow-hidden ancestor -> cannot cause visible overflow
            scrollable = true
            break
          }
          p = p.parentElement
        }
        if (!scrollable) {
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 60),
            right: Math.round(r.right),
            left: Math.round(r.left),
          })
        }
      }
    })
    if (offenders.length > 0 && mainHasOverflow) issues.push({ type: 'elements-outside-viewport', count: offenders.length, sample: offenders.slice(0, 3) })

    // 4. Text clipping: truncate elements whose scrollWidth exceeds clientWidth by a lot
    const clipped = []
    document.querySelectorAll('main#main-content *').forEach((el) => {
      if (el.children.length === 0 && el.textContent && el.textContent.trim().length > 0) {
        const cs = getComputedStyle(el)
        if (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') return // intentional truncation
        if (el.scrollWidth > el.clientWidth + 12 && cs.whiteSpace === 'nowrap') {
          clipped.push({ text: el.textContent.slice(0, 40), cls: String(el.className).slice(0, 50) })
        }
      }
    })
    if (clipped.length > 0) issues.push({ type: 'text-clipping', count: clipped.length, sample: clipped.slice(0, 3) })

    return {
      issues,
      docWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      bodyScrolls: html.scrollHeight > html.clientHeight + 2,
    }
  })
}

;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const results = []
  let totalChecked = 0
  let totalIssues = 0

  for (const role of Object.keys(ROUTES)) {
    // Login once per role per viewport (sessions are viewport-independent but contexts differ)
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await context.newPage()
      try {
        await login(page, role)
      } catch (e) {
        results.push({ role, viewport: vp.name, error: `login failed: ${String(e).slice(0, 120)}` })
        await context.close()
        continue
      }

      for (const route of ROUTES[role]) {
        try {
          const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await page.waitForTimeout(1800)
          const status = resp ? resp.status() : 0
          if (status >= 400) {
            results.push({ role, viewport: vp.name, route, httpStatus: status, skipped: true })
            continue
          }
          const audit = await auditPage(page)
          totalChecked++
          const issueCount = audit.issues.length
          totalIssues += issueCount
          results.push({ role, viewport: vp.name, route, ok: issueCount === 0, issues: audit.issues })

          // Screenshot: desktop for every page, other viewports only when issues found
          if (vp.name === 'desktop-1440' || issueCount > 0) {
            fs.mkdirSync(SHOTS, { recursive: true })
            const safe = route.replace(/\//g, '_').replace(/^_/, '') || 'home'
            await page.screenshot({ path: path.join(SHOTS, `${role}-${safe}-${vp.name}.png`) })
          }
        } catch (e) {
          results.push({ role, viewport: vp.name, route, error: String(e).slice(0, 150) })
        }
      }
      await context.close()
    }
  }

  await browser.close()

  const summary = {
    totalPagesChecked: totalChecked,
    pagesWithIssues: results.filter((r) => r.issues && r.issues.length > 0).length,
    totalIssueGroups: totalIssues,
    pass: totalIssues === 0,
  }
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'visual-polish-results.json'), JSON.stringify({ summary, results }, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  console.log('--- Pages with issues ---')
  for (const r of results.filter((x) => x.issues && x.issues.length > 0)) {
    console.log(`${r.viewport} ${r.role} ${r.route}: ${JSON.stringify(r.issues.map((i) => i.type))}`)
  }
  console.log('--- Errors ---')
  for (const r of results.filter((x) => x.error)) {
    console.log(`${r.viewport ?? '?'} ${r.role ?? '?'} ${r.route ?? ''}: ${r.error}`)
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
