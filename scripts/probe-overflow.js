const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await emailInput.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  await page.waitForTimeout(2000)

  for (const route of ['/exams', '/question-bank']) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const info = await page.evaluate(() => {
      const main = document.querySelector('main#main-content')
      if (!main) return { error: 'no main' }
      const overflow = main.scrollWidth - main.clientWidth
      if (overflow <= 2) return { route: location.pathname, overflow: 0 }
      // Find the deepest element(s) whose right edge exceeds main's client width
      const mainRect = main.getBoundingClientRect()
      const offenders = []
      document.querySelectorAll('main#main-content *').forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.position === 'fixed') return
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.right > mainRect.right + 4) {
          // skip if an ancestor handles overflow
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 70),
            right: Math.round(r.right),
            width: Math.round(r.width),
          })
        }
      })
      // deepest = smallest area offenders
      offenders.sort((a, b) => a.width - b.width)
      return { route: location.pathname, overflow, offenders: offenders.slice(0, 6) }
    })
    console.log(JSON.stringify(info, null, 2))
  }
  await browser.close()
})()
