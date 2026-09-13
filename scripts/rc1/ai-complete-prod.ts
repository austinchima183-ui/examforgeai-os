// RC1 PHASE 19 — test the portable AI path (/api/ai/complete → Supabase edge function)
import { chromium } from '@playwright/test';
const PROD = 'https://web-alpha-bay-87.vercel.app';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(PROD + '/login', { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[placeholder="you@school.edu"]').first();
  await email.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  await email.fill('e2e-teacher-1787626988@examforge-test.com');
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  console.log('teacher login ok');

  const csrf = await page.evaluate(async () => {
    const r = await fetch('/api/auth/csrf');
    return (await r.json().catch(() => ({}))).token ?? null;
  });

  const t0 = Date.now();
  const result = await page.evaluate(async (token) => {
    const r = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({
        prompt: 'Give me a one-sentence definition of photosynthesis for a high-school biology class.',
      }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 800) };
  }, csrf);
  console.log(`POST /api/ai/complete → ${result.status} (${Date.now() - t0}ms)`);
  console.log(result.body);

  await browser.close();
})();
