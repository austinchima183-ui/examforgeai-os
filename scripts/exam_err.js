const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 130)); });
  page.on('response', res => { if (res.status() >= 400) errors.push('HTTP ' + res.status() + ': ' + res.url().slice(0, 110)); });

  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'e2e-teacher-1787626988@examforge-test.com');
  await page.fill('input[type="password"]', 'Teacher123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/teacher', { timeout: 30000 });
  await page.goto('[REDACTED]/exams', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const uniq = [...new Set(errors)];
  console.log('=== /exams unique errors ===');
  uniq.forEach(e => console.log(' ', e));
  await browser.close();
})();
