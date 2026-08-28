// Clean-browser lesson planner test with login
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 140)); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + String(err).slice(0, 140)));

  // Login as teacher
  await page.goto('[REDACTED]/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', 'e2e-teacher-1787626988@examforge-test.com');
  await page.fill('input[type="password"]', 'Teacher123!');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/teacher', { timeout: 30000 });
  console.log('login OK →', page.url());

  // Teacher dashboard content
  await page.waitForTimeout(3000);
  const dashH1 = await page.evaluate(() => document.querySelector('h1')?.textContent);
  console.log('dashboard h1:', dashH1);

  // Lesson planner
  errors.length = 0;
  await page.goto('[REDACTED]/teacher/lesson-planner', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  const lp = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent,
    text: document.body.innerText.slice(0, 200),
    buttons: document.querySelectorAll('button').length,
  }));
  console.log('lesson-planner:', JSON.stringify(lp));
  console.log('lp errors:', errors.length ? errors.slice(0, 5) : 'NONE');

  // Teacher pages suite
  for (const path of ['/teacher/grading', '/teacher/rubric-builder', '/teacher/worksheet-builder', '/teacher/ai-question-generator', '/exams']) {
    errors.length = 0;
    await page.goto('[REDACTED]' + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.slice(0, 40),
      textLen: document.body.innerText.length,
    }));
    console.log(`${path}: h1=${info.h1} textLen=${info.textLen} errors=${errors.length}`);
  }

  await browser.close();
})();
