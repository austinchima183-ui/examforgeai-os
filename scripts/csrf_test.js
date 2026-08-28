const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const responses = [];
  page.on('response', res => {
    if (res.url().includes('/api/auth/csrf') || res.url().includes('/api/cbt/')) {
      responses.push(`${res.request().method()} ${res.url().split('vercel.app')[1]?.slice(0, 50)} → ${res.status()}`);
    }
  });

  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });

  // Direct CSRF fetch test
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/auth/csrf');
    const body = await res.text();
    return `CSRF GET → ${res.status} :: ${body.slice(0, 100)}`;
  });
  console.log(result);

  // Then a session POST with the token manually
  const result2 = await page.evaluate(async () => {
    const csrfRes = await fetch('/api/auth/csrf');
    const { token } = await csrfRes.json();
    const res = await fetch('/api/cbt/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000', examId: 'ba8630ba-37f6-427b-a929-3043d10ae5b2' }),
    });
    return `SESSION POST → ${res.status} :: ${(await res.text()).slice(0, 120)}`;
  });
  console.log(result2);

  await browser.close();
})();
