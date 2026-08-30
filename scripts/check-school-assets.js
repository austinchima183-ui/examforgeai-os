const { chromium } = require('playwright')
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  const failed = []
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url().slice(0, 130)}`)
  })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await emailInput.fill('e2e-superadmin@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  for (const route of ['/schools', '/government']) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)
  }
  const unique = [...new Set(failed)]
  unique.slice(0, 15).forEach((f) => console.log(f))
  console.log(`total unique failed: ${unique.length}`)
  await browser.close()
}
main().catch(console.error)
