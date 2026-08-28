const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('[REDACTED]/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(9000);
  const url = page.url().replace('[REDACTED]', '');
  const dom = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent,
    h2s: Array.from(document.querySelectorAll('h2,h3')).slice(0,5).map(h => h.textContent?.slice(0,30)),
    text: document.body.innerText.slice(0, 300).replace(/\n+/g, ' | '),
    glass: document.querySelectorAll('[class*=forge-glass]').length,
    statCards: document.querySelectorAll('[class*=forge-card-shadow]').length,
  }));
  console.log('URL:', url);
  console.log('h1:', dom.h1);
  console.log('sections:', JSON.stringify(dom.h2s));
  console.log('glass:', dom.glass, '| statCards:', dom.statCards);
  console.log('text:', dom.text.slice(0, 200));
  await browser.close();
})();
