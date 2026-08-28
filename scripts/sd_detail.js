const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 100)); });
  await page.goto('[REDACTED]/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(9000);
  // Get the main content area
  const main = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const children = Array.from(main.children);
    return {
      mainHTML: main.innerHTML.slice(0, 500),
      childCount: children.length,
      h1Text: main.querySelector('h1')?.textContent,
      allText: main.innerText.slice(0, 400).replace(/\n+/g, ' | '),
    };
  });
  console.log('main children:', main.childCount);
  console.log('h1:', main.h1Text);
  console.log('text:', main.allText.slice(0, 300));
  console.log('errors:', errors.length);
  if (errors.length) console.log('first error:', errors[0]);
  await browser.close();
})();
