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

  // Scroll Score Progression card into view and clip-screenshot it
  const card = page.locator('text=Score Progression').first()
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  const box = await card.boundingBox()
  if (box) {
    // walk up ~360px tall, 1136 wide region
    await page.screenshot({
      path: 'download/verification/ux2/screenshots/debug-score-widget.png',
      clip: { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 24), width: 1180, height: 420 },
    })
  }

  // Also inspect computed styles of the empty state text
  const styles = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => e.textContent === 'No graded exams yet')
    if (!el) return null
    const cs = getComputedStyle(el)
    const parent = el.closest('div[class*="motion"], div')
    let motionParent = el.parentElement
    let pcs = null
    while (motionParent) {
      pcs = getComputedStyle(motionParent)
      if (pcs.opacity !== '1' || pcs.transform !== 'none') break
      motionParent = motionParent.parentElement
    }
    return {
      color: cs.color,
      fontSize: cs.fontSize,
      opacity: cs.opacity,
      textContent: el.textContent,
      parentOpacity: pcs?.opacity,
      parentTransform: pcs?.transform,
    }
  })
  console.log(JSON.stringify(styles, null, 2))
  await browser.close()
})()
