import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

/**
 * Ω-6: Comprehensive axe-core WCAG 2.1 AA audit across key app surfaces.
 * Audits: landing (LOCKED — report only), login, and all 5 role dashboards
 * + main table pages. Saves full violation details with node selectors.
 */

const AXE_SRC = readFileSync('node_modules/axe-core/axe.min.js', 'utf-8')

const USERS: Record<string, { email: string; password: string }> = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
}

const PAGES: Array<{ name: string; path: string; as?: keyof typeof USERS }> = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'pricing', path: '/pricing' },
  { name: 'features', path: '/features' },
  { name: 'security-page', path: '/security' },
  { name: 'docs', path: '/docs' },
  { name: 'student-dashboard', path: '/dashboard/student', as: 'student' },
  { name: 'student-exams', path: '/exams', as: 'student' },
  { name: 'student-results', path: '/results', as: 'student' },
  { name: 'student-notifications', path: '/notifications', as: 'student' },
  { name: 'student-settings', path: '/settings', as: 'student' },
  { name: 'marketplace', path: '/marketplace', as: 'student' },
  { name: 'teacher-dashboard', path: '/dashboard/teacher', as: 'teacher' },
  { name: 'teacher-question-bank', path: '/question-bank', as: 'teacher' },
  { name: 'teacher-lesson-planner', path: '/teacher/lesson-planner', as: 'teacher' },
  { name: 'school-admin-dashboard', path: '/dashboard/school-admin', as: 'school_admin' },
  { name: 'school-settings', path: '/school/settings', as: 'school_admin' },
  { name: 'school-attendance', path: '/school/attendance', as: 'school_admin' },
  { name: 'school-fees', path: '/school/fees', as: 'school_admin' },
  { name: 'students-table', path: '/students', as: 'super_admin' },
  { name: 'teachers-table', path: '/teachers', as: 'super_admin' },
  { name: 'schools-table', path: '/schools', as: 'super_admin' },
  { name: 'super-admin-dashboard', path: '/dashboard/super-admin', as: 'super_admin' },
  { name: 'admin-audit-logs', path: '/admin/audit-logs', as: 'super_admin' },
  { name: 'admin-organizations', path: '/admin/organizations', as: 'super_admin' },
  { name: 'workflows', path: '/workflows', as: 'super_admin' },
  { name: 'billing', path: '/billing', as: 'super_admin' },
]

async function runAxe(page: any) {
  await page.evaluate(AXE_SRC)
  return page.evaluate(async () => {
    const results = await (window as any).axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
    return results.violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      wcag: v.tags.filter((t: string) => t.startsWith('wcag')).join(','),
      nodes: v.nodes.length,
      selectors: v.nodes.slice(0, 4).map((n: any) => n.target.join(' ')).slice(0, 200),
      failureSummary: v.nodes[0]?.failureSummary?.slice(0, 200),
    }))
  })
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const report: Record<string, any> = { auditedAt: new Date().toISOString(), tool: 'axe-core WCAG 2.1 AA', pages: [] }
  const violationTypes = new Map<string, { nodes: number; pages: string[]; impact: string; help: string; wcag: string; selectors: string[] }>()

  // current logged-in user tracking
  let loggedIn: string | null = null

  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      if (p.as && loggedIn !== p.as) {
        const u = USERS[p.as]
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
        await page.fill('input[type="email"], input[name="email"]', u.email)
        await page.fill('input[type="password"], input[name="password"]', u.password)
        await page.click('button[type="submit"]')
        await page.waitForURL((url: any) => !url.pathname.startsWith('/login'), { timeout: 45000 })
        loggedIn = p.as
      }
      await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3500)

      const violations = await runAxe(page)
      report.pages.push({ page: p.path, role: p.as ?? 'anonymous', violations })
      for (const v of violations) {
        const entry = violationTypes.get(v.id) ?? {
          nodes: 0, pages: [], impact: v.impact, help: v.help, wcag: v.wcag, selectors: [],
        }
        entry.nodes += v.nodes
        entry.pages.push(p.path)
        entry.selectors.push(...v.selectors.slice(0, 2))
        violationTypes.set(v.id, entry)
      }
      console.log(`${violations.length === 0 ? 'CLEAN' : String(violations.length).padStart(4) + ' types'}  ${p.path}`)
      for (const v of violations) {
        console.log(`    ${v.id} (${v.impact ?? '?'}): ${v.nodes} nodes — ${v.help}`)
      }
    } catch (e: any) {
      console.log(`ERROR  ${p.path}: ${e.message.slice(0, 100)}`)
      report.pages.push({ page: p.path, role: p.as ?? 'anonymous', error: e.message.slice(0, 200) })
    } finally {
      await page.close()
    }
  }

  report.summary = {
    pagesAudited: report.pages.length,
    totalViolationTypes: violationTypes.size,
    totalNodes: Array.from(violationTypes.values()).reduce((a, b) => a + b.nodes, 0),
    byType: Object.fromEntries(
      Array.from(violationTypes.entries()).sort((a, b) => b[1].nodes - a[1].nodes)
        .map(([id, v]) => [id, { nodes: v.nodes, pages: v.pages.length, impact: v.impact, wcag: v.wcag, help: v.help, selectors: v.selectors.slice(0, 3) }])
    ),
  }

  const { writeFileSync, mkdirSync } = await import('fs')
  mkdirSync('download/verification/omega-local', { recursive: true })
  writeFileSync('download/verification/omega-local/a11y-audit.json', JSON.stringify(report, null, 2))
  console.log(`\n=== SUMMARY: ${report.summary.totalViolationTypes} violation types, ${report.summary.totalNodes} nodes across ${report.summary.pagesAudited} pages ===`)
  await browser.close()
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
