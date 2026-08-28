const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const targets = [
    { role: 'parent', email: 'e2e-parent-1787626988@examforge-test.com', pw: 'Parent123!', routes: ['/parent/fees'], vw: 390, vh: 844 },
    { role: 'school_admin', email: 'e2e-schooladmin-1787626988@examforge-test.com', pw: 'SchoolAdmin123!', routes: ['/school/attendance'], vw: 768, vh: 1024 },
  ]
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.vw, height: t.vh } })
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input[placeholder="you@school.edu"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    await emailInput.fill(t.email)
    await page.fill('input[placeholder="Enter your password"]', t.pw)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
    for (const route of t.routes) {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
      const info = await page.evaluate(() => {
        const main = document.querySelector('main#main-content')
        if (!main) return { error: 'no main' }
        const overflow = main.scrollWidth - main.clientWidth
        if (overflow <= 2) return { route: location.pathname, overflow: 0 }
        const mainRect = main.getBoundingClientRect()
        const offenders = []
        document.querySelectorAll('main#main-content *').forEach((el) => {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.position === 'fixed') return
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.right > mainRect.right + 4) {
            offenders.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 25),
              cls: String(el.className).slice(0, 55),
              right: Math.round(r.right),
              width: Math.round(r.width),
            })
          }
        })
        offenders.sort((a, b) => a.width - b.width)
        return { route: location.pathname, overflow, offenders: offenders.slice(0, 5) }
      })
      console.log(JSON.stringify(info))
    }
    await page.close()
  }
  await browser.close()
})()
