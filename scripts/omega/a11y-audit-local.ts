// ============================================================================
// Ω-6 Accessibility Audit — axe-core against the LOCAL production build
// (includes the new Widget System 3.0 + FAB + toolbar)
// Audits: login (public) + student dashboard (widgets) + marketplace dialog.
// ============================================================================
import { chromium, devices } from '@playwright/test'
import * as fs from 'fs'

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'
const AXE_SRC = '/home/z/my-project/node_modules/axe-core/axe.min.js'
const OUT = '/home/z/my-project/download/verification/omega-local/a11y-audit.json'

async function runAxe(page: any, label: string) {
  await page.addScriptTag({ path: AXE_SRC })
  const results = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document, {
      rules: {
        // Widget framework relies on nested interactive controls inside
        // listitems intentionally (role=listitem wrapper contains buttons).
        'nested-interactive': { enabled: true },
      },
    })
    return {
      violations: r.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        tags: v.tags.filter((t: string) => t.startsWith('wcag')),
        sample: v.nodes.slice(0, 2).map((n: any) => n.target.join(' ')).join(' | '),
      })),
      passes: r.passes.length,
      incomplete: r.incomplete.length,
    }
  })
  console.log(`[${label}] passes=${results.passes} violations=${results.violations.length}`)
  for (const v of results.violations) {
    console.log(`  ✘ ${v.id} (${v.impact}, ${v.nodes} nodes) [${v.tags.join(',')}] — ${v.sample}`)
  }
  return { label, ...results }
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const all: unknown[] = []

  // 1. Public login page
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  all.push(await runAxe(page, 'login'))

  // 2. Login as student
  await page.locator('input[placeholder="you@school.edu"]').first().fill('prod-final-1787626351@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  await page.waitForTimeout(4000)

  // 3. Student dashboard with widgets
  all.push(await runAxe(page, 'student-dashboard'))

  // 4. Widget marketplace open
  await page.getByRole('button', { name: 'Open widget marketplace to add or hide widgets' }).click()
  await page.waitForTimeout(900)
  all.push(await runAxe(page, 'widget-marketplace'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // 5. Fullscreen widget overlay
  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.locator('[role="listitem"]').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await grid.locator('[role="listitem"]').first().dispatchEvent('contextmenu')
  await page.waitForTimeout(600)
  const fsBtn = page.getByRole('button', { name: /Expand .* to fullscreen/ }).first()
  if (await fsBtn.isVisible().catch(() => false)) {
    await fsBtn.click({ force: true })
    await page.waitForTimeout(900)
    all.push(await runAxe(page, 'widget-fullscreen'))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  // 6. Mobile viewport — fresh reload to clear any leftover menu/dialog DOM
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1200)
  all.push(await runAxe(page, 'student-dashboard-mobile-390'))

  fs.writeFileSync(OUT, JSON.stringify({ auditedAt: new Date().toISOString(), base: BASE, results: all }, null, 2))
  console.log(`saved: ${OUT}`)
  await browser.close()
}

main().catch((e) => {
  console.error('a11y audit failed:', e)
  process.exit(1)
})
