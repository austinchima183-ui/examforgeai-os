// Debug login flow — capture what happens after submit
import { chromium } from 'playwright'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await email.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForTimeout(8000)
  await page.screenshot({ path: 'download/verification/audit/login-debug.png', fullPage: false })
  console.log('URL after 8s:', page.url())
  // check for error text on page
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const lines = bodyText.split('\n').filter(l => l.trim()).slice(0, 15)
  console.log('Page text:', JSON.stringify(lines))
  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
