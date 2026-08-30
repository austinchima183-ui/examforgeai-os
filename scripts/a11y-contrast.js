const { chromium } = require('playwright')
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  await page.goto('http://localhost:3000/exams', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.addScriptTag({ path: '/home/z/my-project/node_modules/axe-core/axe.min.js' })
  const details = await page.evaluate(async () => {
    const r = await window.axe.run(document, { rules: { 'color-contrast': { enabled: true } } })
    const v = r.violations.find(x => x.id === 'color-contrast')
    if (!v) return []
    return v.nodes.slice(0, 12).map(n => ({
      html: n.html.slice(0, 100),
      summary: (n.failureSummary || '').split('\n').filter(Boolean).slice(0, 4),
    }))
  })
  console.log(JSON.stringify(details, null, 2))
  await browser.close()
}
main().catch(console.error)
