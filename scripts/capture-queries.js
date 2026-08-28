const { chromium } = require('playwright')
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  page.on('requestfailed', () => {})
  const failed = []
  page.on('response', async (res) => {
    if (res.status() >= 400 && res.url().includes('supabase')) {
      let body = ''
      try { body = await res.text() } catch {}
      failed.push({ url: res.url(), status: res.status(), body: body.slice(0, 300) })
    }
  })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  await page.waitForTimeout(8000)
  console.log(JSON.stringify(failed, null, 2))
  await browser.close()
}
main().catch(console.error)
