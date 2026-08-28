const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const failed = [];
  page.on('response', res => { if (res.status() >= 400) failed.push(res.status() + ' ' + res.url().slice(0, 110)); });
  page.on('requestfailed', req => failed.push('REQFAIL ' + req.url().slice(0, 110)));
  await page.goto('[REDACTED]/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  console.log('=== FAILED RESOURCES (production landing) ===');
  console.log(failed.length ? failed.join('\n') : 'NONE');
  await browser.close();
})();
