// Reproduce the super-admin journey to catch the $.filter error
const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console.error]', msg.text().slice(0, 150))
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await emailInput.fill('e2e-superadmin@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })

  // The super-admin journey visits: dashboard → schools → admin console → government
  for (const route of ['/dashboard/super-admin', '/schools', '/government']) {
    console.log(`── visiting ${route} ──`)
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    console.log(`   URL: ${page.url()} | body length: ${(await page.locator('body').innerText().catch(() => '')).length}`)
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
