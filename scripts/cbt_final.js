const { chromium } = require('playwright-core');
const BASE = '[REDACTED]';
const EXAM_ID = process.argv[2];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const netLog = [];
  const consoleErrors = [];
  page.on('response', res => {
    if (res.url().includes('/api/cbt') || res.url().includes('/api/auth/csrf')) {
      netLog.push(`${res.request().method()} ${res.url().split('vercel.app')[1]?.split('?')[0]} → ${res.status()}`);
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 250)));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });
  try {
    await page.locator('button:has-text("Skip onboarding for now")').first().click({ timeout: 3000 });
    await page.waitForTimeout(1500);
  } catch {}
  console.log('✓ logged in');

  await page.goto(`${BASE}/exams/${EXAM_ID}/take`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);

  const startBtn = page.locator('button:has-text("Start")').first();
  await startBtn.click({ timeout: 8000 });
  await page.waitForTimeout(5000);
  console.log('✓ started');

  // Dump the active exam DOM to find the real option markup
  const dom = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const html = main.innerHTML;
    // Find question-related elements
    const radios = document.querySelectorAll('[role="radio"], input[type="radio"]').length;
    const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent?.trim()).filter(Boolean).slice(0, 10);
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 15);
    return { radios, labels, buttons, mainLen: html.length, mainStart: html.slice(0, 400) };
  });
  console.log('radios:', dom.radios);
  console.log('labels:', JSON.stringify(dom.labels));
  console.log('buttons:', JSON.stringify(dom.buttons));
  console.log('main HTML start:', dom.mainStart.replace(/\s+/g, ' ').slice(0, 300));

  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.slice(0, 6).forEach(e => console.log(' ', e));
  console.log('\n=== CBT NETWORK ===');
  netLog.forEach(l => console.log(' ', l));
  await browser.close();
})();
