const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  await page.waitForTimeout(4000)

  const info = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => e.textContent === 'No graded exams yet')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const card = el.closest('section') || el.closest('div.rounded-xl')
    const cr = card?.getBoundingClientRect()
    return {
      textRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      cardRect: cr ? { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      textInCardBounds: cr ? (r.y >= cr.y && r.y + r.height <= cr.y + cr.height) : null,
      // any ancestor with overflow hidden clipping the text?
      clippedByAncestor: (() => {
        let node = el.parentElement
        while (node) {
          const cs = getComputedStyle(node)
          if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
            const nr = node.getBoundingClientRect()
            if (r.bottom > nr.bottom + 2 || r.top < nr.top - 2) return { tag: node.tagName, cls: node.className.slice(0, 80), nodeRect: { y: Math.round(nr.y), h: Math.round(nr.height) } }
          }
          node = node.parentElement
        }
        return null
      })(),
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})()
