// Probe: count email inputs on /login
import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder="you@school.edu"]'))
    return inputs.map((i) => {
      const rect = i.getBoundingClientRect()
      const form = i.closest('form')
      return {
        id: i.id,
        hidden: (i as HTMLInputElement).hidden || rect.width === 0 || rect.height === 0,
        visible: !!(i.offsetWidth || i.offsetHeight || i.getClientRects().length),
        formLabel: form?.getAttribute('aria-label'),
        parentChain: i.closest('[aria-hidden="true"]') ? 'inside-aria-hidden' : 'normal',
      }
    })
  })
  console.log(JSON.stringify(info, null, 1))
  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
