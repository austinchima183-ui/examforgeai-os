// ============================================================================
// Accessibility audit — axe-core on key public + authenticated pages
// ============================================================================
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const PAGES_PUBLIC = [
  ['landing', '/'],
  ['pricing', '/pricing'],
  ['login', '/login'],
  ['register', '/register'],
]

const PAGES_AUTH = [
  ['student-dashboard', '/dashboard/student'],
  ['exams', '/exams'],
  ['results', '/results'],
]

async function auditPage(page, name, route) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2000)
  await page.addScriptTag({ path: path.resolve(__dirname, '..', 'node_modules/axe-core/axe.min.js') })
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await window.axe.run(document, {
      resultTypes: ['violations'],
      rules: {
        // Next.js injects some dev-only attributes; focus on real issues
        'color-contrast': { enabled: true },
      },
    })
  })
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    tags: v.tags.filter((t) => t.startsWith('wcag') || t.startsWith('best-practice')).slice(0, 3),
  }))
  console.log(`  ${name} (${route}): ${violations.length} violation types, ${violations.reduce((s, v) => s + v.nodes, 0)} nodes`)
  for (const v of violations) {
    console.log(`    [${v.impact}] ${v.id}: ${v.help} (${v.nodes} nodes)`)
  }
  return { page: name, route, violations }
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const all = []

  // Public pages (unauthenticated)
  for (const [name, route] of PAGES_PUBLIC) {
    try {
      all.push(await auditPage(page, name, route))
    } catch (e) {
      console.log(`  ${name}: FAILED — ${String(e).slice(0, 80)}`)
      all.push({ page: name, route, error: String(e).slice(0, 200) })
    }
  }

  // Login as student for auth pages
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  await page.waitForTimeout(2000)

  for (const [name, route] of PAGES_AUTH) {
    try {
      all.push(await auditPage(page, name, route))
    } catch (e) {
      console.log(`  ${name}: FAILED — ${String(e).slice(0, 80)}`)
      all.push({ page: name, route, error: String(e).slice(0, 200) })
    }
  }

  fs.mkdirSync('download/verification', { recursive: true })
  fs.writeFileSync('download/verification/accessibility-audit.json', JSON.stringify({
    auditedAt: new Date().toISOString(),
    tool: 'axe-core (WCAG 2.1 AA)',
    pages: all,
    summary: {
      pagesAudited: all.length,
      totalViolationTypes: all.reduce((s, p) => s + (p.violations?.length ?? 0), 0),
      totalNodes: all.reduce((s, p) => s + (p.violations?.reduce((a, v) => a + v.nodes, 0) ?? 0), 0),
    },
  }, null, 2))
  console.log('\nSaved → download/verification/accessibility-audit.json')
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
