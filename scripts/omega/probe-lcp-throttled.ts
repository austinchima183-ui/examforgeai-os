// Measure LCP element under Lighthouse-like throttling (slow 4G + 4x CPU)
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices['Pixel 5'] }) // mobile emulation
  const page = await context.newPage()

  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150, // round trip
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
    uploadThroughput: (750 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.addInitScript(() => {
    ;(window as any).__lcp = null
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        ;(window as any).__lcp = {
          size: last.size,
          startTime: Math.round(last.startTime),
          tagName: (last as any).element?.tagName,
          className: String((last as any).element?.className || '').slice(0, 100),
          text: ((last as any).element?.textContent || '').trim().slice(0, 60),
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'load', timeout: 90000 })
  await page.waitForTimeout(12000)
  const lcp = await page.evaluate(() => (window as any).__lcp)
  console.log('LCP (throttled mobile):', JSON.stringify(lcp, null, 1))
  await page.screenshot({ path: '/tmp/login-mobile.png' })

  await browser.close()
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
