const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await emailInput.fill('e2e-superadmin@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  await page.waitForTimeout(3500)

  const result = await page.evaluate(() => {
    const main = document.querySelector('main#main-content')
    if (!main) return { error: 'no main' }
    // Find the sticky toolbar band (first child of the page content with sticky class)
    const stickyBand = main.querySelector('.sticky.top-0')
    if (!stickyBand) return { error: 'no sticky band found', mainChildren: main.querySelector('div')?.className?.slice(0, 100) }
    const measure = () => {
      const r = stickyBand.getBoundingClientRect()
      const mainR = main.getBoundingClientRect()
      return {
        bandTop: Math.round(r.top),
        mainTop: Math.round(mainR.top),
        bandSticksToMainTop: Math.abs(r.top - mainR.top) < 4,
        scrollTop: Math.round(main.scrollTop),
        titleVisible: stickyBand.textContent.includes('Dashboard'),
        actionVisible: Boolean(stickyBand.querySelector('a, button')),
      }
    }
    const before = measure()
    main.scrollTop = 1200
    return new Promise((resolve) => {
      setTimeout(() => {
        const after = measure()
        // Also confirm the toolbar overlaps content that scrolled under it
        const cs = getComputedStyle(stickyBand)
        resolve({
          before,
          after,
          stickyWorked: after.bandSticksToMainTop && after.scrollTop === 1200 && after.titleVisible,
          position: cs.position,
          zIndex: cs.zIndex,
          backdropFilter: cs.backdropFilter,
        })
      }, 600)
    })
  })
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
})()
