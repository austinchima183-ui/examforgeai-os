import { chromium } from '@playwright/test'

/**
 * Ω-1 diagnosis: why does login not redirect after successful auth?
 */
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
  page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`))
  page.on('response', async (r) => {
    if (r.url().includes('/auth/') || r.url().includes('token')) {
      console.log(`  [net] ${r.status()} ${r.request().method()} ${r.url().slice(0, 110)}`)
    }
  })

  console.log('1. goto /login')
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 45000 })
  console.log(`   url=${page.url()}`)

  console.log('2. fill credentials')
  await page.fill('input[type="email"], input[name="email"]', 'prod-final-1787626351@examforge-test.com')
  await page.fill('input[type="password"], input[name="password"]', 'SecurePass123!')

  console.log('3. submit')
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => 'nav timeout (ok)'),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(6000)
  console.log(`   url after submit = ${page.url()}`)

  const bodyText = (await page.textContent('body'))?.slice(0, 400) ?? ''
  console.log(`4. body snippet: ${bodyText.replace(/\s+/g, ' ').slice(0, 300)}`)

  console.log(`5. console errors: ${consoleErrors.length}`)
  consoleErrors.slice(0, 5).forEach((e) => console.log(`   [console] ${e}`))
  console.log(`6. failed requests: ${failedRequests.length}`)
  failedRequests.slice(0, 5).forEach((r) => console.log(`   [reqfail] ${r}`))

  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
