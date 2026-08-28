const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 140)) })
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 140)))

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await emailInput.fill('e2e-superadmin@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })

  const routes = ['/schools', '/admin/users', '/admin/roles', '/admin/audit-logs', '/admin/security', '/government', '/workflows']
  for (const route of routes) {
    errors.length = 0
    const resp = await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
    await page.waitForTimeout(4000)
    const filtered = errors.filter((e) => !e.includes('401') && !e.includes('403') && !e.includes('net::ERR') && !e.includes('favicon') && !e.includes('Failed to load resource'))
    console.log(`${route} [${resp ? resp.status() : 'ERR'}]: ${filtered.length === 0 ? 'CLEAN' : JSON.stringify(filtered.slice(0, 2))}`)
  }
  await browser.close()
})()
