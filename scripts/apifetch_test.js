const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('response', res => {
    if (res.url().includes('/api/auth/csrf') || res.url().includes('/api/cbt/')) {
      console.log(`NET: ${res.request().method()} ${res.url().split('vercel.app')[1]?.slice(0, 45)} → ${res.status()}`);
    }
  });

  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });

  // Check the auth store state
  const storeState = await page.evaluate(() => {
    // Try to read persisted zustand state
    const raw = localStorage.getItem('examforge-auth-storage');
    return raw ? raw.slice(0, 200) : 'NO STORE';
  });
  console.log('auth store:', storeState);

  // Get the actual user id
  const userId = await page.evaluate(async () => {
    const res = await fetch('/api/auth/csrf');
    return res.status;
  });
  console.log('csrf direct:', userId);

  await browser.close();
})();
