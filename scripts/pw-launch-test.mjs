import { chromium } from '@playwright/test'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto('data:text/html,<h1>ExamForge PW Test</h1>')
const text = await page.textContent('h1')
console.log('LAUNCH OK:', text)
await browser.close()
