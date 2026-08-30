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
  await page.waitForTimeout(3000)

  const info = await page.evaluate(() => {
    // Find the Score Progression section card
    const cards = Array.from(document.querySelectorAll('section, div'))
    const target = Array.from(document.querySelectorAll('h3, h2, [class*="font-semibold"]'))
      .find((el) => el.textContent?.trim() === 'Score Progression')
    if (!target) return { found: false }
    // Walk up to the card container
    let card = target
    for (let i = 0; i < 6 && card.parentElement; i++) {
      card = card.parentElement
      if (card.className.includes('rounded-xl')) break
    }
    const rect = card.getBoundingClientRect()
    const inner = card.innerHTML.slice(0, 600)
    // check chart container
    const chartContainer = card.querySelector('[class*="recharts"]')
    const emptyText = card.textContent?.includes('No graded exams yet')
    return {
      found: true,
      cardRect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      hasEmptyText: emptyText,
      hasRecharts: Boolean(chartContainer),
      textContent: card.textContent?.slice(0, 300),
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})()
