import { chromium } from '@playwright/test'
const BASE = process.env.VERIFY_BASE || 'https://web-alpha-bay-87.vercel.app'
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const result = await page.evaluate(() => {
    const html = document.documentElement
    const cs = getComputedStyle(html)
    const probe = document.querySelector('.text-muted-foreground')
    return {
      htmlClasses: html.className,
      rootMuted: getComputedStyle(html).getPropertyValue('--muted-foreground'),
      probeColor: probe ? getComputedStyle(probe).color : 'n/a',
      darkApplied: html.classList.contains('dark'),
    }
  })
  console.log(JSON.stringify(result, null, 1))
  await browser.close()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
