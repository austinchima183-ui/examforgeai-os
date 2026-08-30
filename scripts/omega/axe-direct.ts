import { chromium } from '@playwright/test'
const BASE = 'https://web-alpha-bay-87.vercel.app'
const AXE_SRC = '/home/z/my-project/node_modules/axe-core/axe.min.js'
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
  await page.waitForTimeout(4000)
  await page.addScriptTag({ path: AXE_SRC })
  const results = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document)
    return {
      violations: r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.length })),
      colorContrastNodes: r.violations.find((v: any) => v.id === 'color-contrast')?.nodes.slice(0, 5).map((n: any) => n.target) ?? [],
    }
  })
  console.log(JSON.stringify(results, null, 1))
  await browser.close()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
