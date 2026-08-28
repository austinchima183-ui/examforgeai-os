const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 100)); });
  page.on('response', res => { if (res.status() >= 400 && !res.url().includes('favicon')) errors.push('HTTP ' + res.status() + ': ' + res.url().slice(-70)); });

  // Login as teacher
  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'e2e-teacher-1787626988@examforge-test.com');
  await page.fill('input[type="password"]', 'Teacher123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/teacher', { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check dashboard renders + no profiles 404s
  const dash = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.slice(0, 40),
    textLen: document.body.innerText.length,
  }));
  console.log('teacher dashboard:', JSON.stringify(dash));
  const profiles404 = errors.filter(e => e.includes('profiles') || e.includes('payments'));
  console.log('schema 404s:', profiles404.length === 0 ? 'NONE (fixes live)' : profiles404.slice(0,3));
  await browser.close();
})();
