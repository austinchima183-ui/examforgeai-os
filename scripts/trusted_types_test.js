// Clean-browser trusted-types verification — no agent-browser config
const { chromium } = require('playwright-core');

(async () => {
  const exePath = '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
  const browser = await chromium.launch({
    executablePath: exePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 120)); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + String(err).slice(0, 120)));

  await page.goto('[REDACTED]/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);

  const landingErrors = [...errors];
  errors.length = 0;

  // Test script.src assignment in clean context
  const probe = await page.evaluate(() => {
    try {
      const s = document.createElement('script');
      s.src = 'https://example.com/x.js';
      return 'assignment OK (no trusted types enforcement)';
    } catch (e) {
      return 'BLOCKED: ' + e.message.slice(0, 60);
    }
  });

  console.log('=== CLEAN CHROME: landing page ===');
  console.log('script.src probe:', probe);
  console.log('console errors:', landingErrors.length ? landingErrors : 'NONE');

  await browser.close();
})();
