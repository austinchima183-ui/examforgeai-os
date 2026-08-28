// Isolate which student-journey page throws the RSC error
const { chromium } = require('@playwright/test')

const PAGES = [
  '/dashboard/student', '/student/practice', '/student/progress',
  '/student/flashcards', '/results', '/notifications', '/profile',
  '/exams', '/student/ai-tutor', '/student/explain',
]

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[placeholder="you@school.edu"]', 'prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })

  for (const route of PAGES) {
    const errors = []
    const handler = (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Server Components render')) {
        errors.push(msg.text().slice(0, 80))
      }
    }
    page.on('console', handler)
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    page.off('console', handler)
    console.log(`${errors.length > 0 ? '✗ RSC ERROR' : '✓ ok       '} ${route}`)
  }

  await browser.close()
})()
