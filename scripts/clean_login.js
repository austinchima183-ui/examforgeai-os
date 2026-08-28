const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const url = page.url().replace('[REDACTED]', '');
  const dom = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.slice(0, 50),
    text: document.body.innerText.length,
    glass: document.querySelectorAll('[class*=forge-glass]').length,
    mainHTML: (document.querySelector('main')?.innerText || '').slice(0, 200).replace(/\n+/g, ' | '),
  }));
  console.log(`URL: ${url}`);
  console.log(`h1: ${dom.h1}`);
  console.log(`text: ${dom.text}ch | glass: ${dom.glass}`);
  console.log(`main: ${dom.mainHTML}`);
  await browser.close();
})();
