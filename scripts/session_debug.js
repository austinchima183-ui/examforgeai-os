const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  // Capture the session POST request headers + response body
  page.on('request', req => {
    if (req.url().includes('/api/cbt/session')) {
      console.log('REQ headers:', JSON.stringify(req.headers()));
      console.log('REQ body:', req.postData()?.slice(0, 150));
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/cbt/session')) {
      const body = await res.text().catch(() => '');
      console.log('RES:', res.status(), body.slice(0, 200));
    }
  });

  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });
  try { await page.locator('button:has-text("Skip onboarding for now")').first().click({ timeout: 3000 }); await page.waitForTimeout(1000); } catch {}

  const EXAM_ID = process.argv[2];
  await page.goto(`[REDACTED]/exams/${EXAM_ID}/take`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.locator('button:has-text("Start")').first().click({ timeout: 8000 });
  await page.waitForTimeout(6000);
  await browser.close();
})();
