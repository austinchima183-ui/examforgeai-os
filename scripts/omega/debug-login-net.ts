// Debug login with network capture
import { chromium } from 'playwright'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()

  page.on('response', async res => {
    const url = res.url()
    if (url.includes('supabase') || url.includes('auth') || url.includes('api')) {
      console.log(`  NET ${res.status()} ${res.request().method()} ${url.replace('https://', '').slice(0, 90)}`)
    }
  })
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  CONSOLE ERROR:', msg.text().slice(0, 150))
  })

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  console.log('filling credentials...')
  await email.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')

  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000)
    if (!page.url().includes('login')) { console.log(`REDIRECTED after ${(i + 1) * 2}s → ${page.url()}`); break }
    if (i === 11) console.log('STILL ON LOGIN after 24s')
  }
  await page.screenshot({ path: 'download/verification/audit/login-debug2.png' })
  const errVisible = await page.locator('[role="alert"], .text-destructive, [data-testid="login-error"]').allInnerTexts().catch(() => [])
  console.log('Error elements:', JSON.stringify(errVisible.slice(0, 3)))
  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
