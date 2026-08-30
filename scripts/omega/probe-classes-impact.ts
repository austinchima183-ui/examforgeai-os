import { chromium } from '@playwright/test'

/**
 * Ω-1: verify app-level impact of the classes-policy recursion (42P17).
 * Login as school admin → call the classes API through the app → record result.
 */
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"], input[name="email"]', 'e2e-schooladmin-1787626988@examforge-test.com')
  await page.fill('input[type="password"], input[name="password"]', 'SchoolAdmin123!')
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('logged in:', page.url())

  // hit the classes API through the app (session cookies apply)
  const res = await page.request.get('http://localhost:3000/api/school/classes')
  const body = await res.text()
  console.log(`GET /api/school/classes → ${res.status()}`)
  console.log(`body: ${body.slice(0, 200)}`)

  // also the classes page
  await page.goto('http://localhost:3000/school/classes', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(4000)
  const main = await page.locator('main').innerText().catch(() => '<no main>')
  console.log(`\n/school/classes page url=${page.url()}`)
  console.log(`page text snippet: ${main.replace(/\s+/g, ' ').slice(0, 300)}`)

  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
