const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('[REDACTED]/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'e2e-superadmin@examforge-test.com');
  await page.fill('input[type="password"]', 'SuperAdmin123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(9000);
  const url = page.url().replace('[REDACTED]', '');
  const info = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.slice(0, 40),
    textLen: document.body.innerText.length,
    navItems: document.querySelectorAll('[data-nav-item]').length,
  })).catch(() => ({h1: 'n/a', textLen: 0, navItems: 0}));
  console.log(`super_admin → ${url} h1="${info.h1}" text=${info.textLen}ch nav=${info.navItems}`);
  await browser.close();
})();
