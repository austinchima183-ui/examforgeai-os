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
  page.on('response', res => {
    if (res.url().includes('/api/') || res.url().includes('_rsc')) {
      netLog.push(`${res.request().method()} ${res.url().split('vercel.app')[1]?.slice(0, 60)} → ${res.status()}`);
    }
  });
  page.on('console', msg => { if (msg.type() === 'error') netLog.push('CONSOLE: ' + msg.text().slice(0, 100)); });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'prod-final-1787626351@examforge-test.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });

  await page.goto(`${BASE}/exams/${EXAM_ID}/take`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  console.log('after load:', page.url().replace(BASE, ''));

  // snapshot the pre-exam state
  const preState = await page.evaluate(() => ({
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 12),
    bodyStart: document.body.innerText.slice(0, 200).replace(/\n+/g, '|'),
  }));
  console.log('buttons:', JSON.stringify(preState.buttons));
  console.log('body:', preState.bodyStart);

  const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
  await startBtn.click({ timeout: 5000 });
  await page.waitForTimeout(5000);
  console.log('\nafter start:', page.url().replace(BASE, ''));

  const postState = await page.evaluate(() => ({
    hasRadios: document.querySelectorAll('[role="radio"]').length,
    hasOptions: document.querySelectorAll('label').length,
    bodyStart: document.body.innerText.slice(0, 300).replace(/\n+/g, '|'),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 10),
  }));
  console.log('radios:', postState.hasRadios, '| labels:', postState.hasOptions);
  console.log('body:', postState.bodyStart);
  console.log('buttons:', JSON.stringify(postState.buttons));

  console.log('\n=== NETWORK ===');
  netLog.slice(-15).forEach(l => console.log(' ', l));
  await browser.close();
})();
