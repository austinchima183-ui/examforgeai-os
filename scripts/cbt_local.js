const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3000';
const EXAM_ID = process.argv[2];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });
  try { await page.locator('button:has-text("Skip onboarding for now")').first().click({ timeout: 3000 }); await page.waitForTimeout(1500); } catch {}

  await page.goto(`${BASE}/exams/${EXAM_ID}/take`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.locator('button:has-text("Start")').first().click({ timeout: 8000 });
  await page.waitForTimeout(5000);

  const answers = ['label:has-text("4")', 'label:has-text("Abuja")', 'button:has-text("True")'];
  for (let i = 0; i < answers.length; i++) {
    try {
      await page.locator(answers[i]).first().click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      if (i < 2) {
        const next = page.locator('button:has-text("Next")').first();
        if (await next.count()) { await next.click(); await page.waitForTimeout(800); }
      }
    } catch (e) { console.log(`Q${i+1} click failed`); }
  }

  // Submit
  try {
    await page.locator('button:has-text("Submit")').first().click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    const confirm = page.locator('[role="dialog"] button:has-text("Submit")').last();
    if (await confirm.count()) await confirm.click({ timeout: 5000 });
    await page.waitForTimeout(10000);
    console.log('submitted, URL:', page.url().replace(BASE, ''));
    const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('post-exam snippet:', text.replace(/\n+/g, ' | ').slice(0, 300));
  } catch (e) { console.log('submit err:', String(e).slice(0, 80)); }

  await browser.close();
})();
