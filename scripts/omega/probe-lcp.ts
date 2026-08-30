// Measure LCP element directly via PerformanceObserver
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.addInitScript(() => {
    ;(window as any).__lcp = null
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        ;(window as any).__lcp = {
          size: last.size,
          startTime: last.startTime,
          url: (last as any).url || '',
          tagName: (last as any).element?.tagName,
          id: (last as any).element?.id,
          className: String((last as any).element?.className || '').slice(0, 120),
          text: ((last as any).element?.textContent || '').trim().slice(0, 80),
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(6000)
  const lcp = await page.evaluate(() => (window as any).__lcp)
  console.log('LCP:', JSON.stringify(lcp, null, 1))

  await browser.close()
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
