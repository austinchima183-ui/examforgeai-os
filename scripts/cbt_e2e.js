// ═══════════════════════════════════════════════════════════════════
// ExamForge AI — CBT End-to-End Verification
// Student logs in → opens exam → starts → answers → submits → sees result
// ═══════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');

const BASE = '[REDACTED]';
const EXAM_ID = process.argv[2];
const EMAIL = 'prod-final-1787626351@examforge-test.com';
const PASSWORD = 'SecurePass123!';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 120)); });
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      errors.push('HTTP ' + res.status() + ': ' + res.url().slice(-80));
    }
  });
  const networkLog = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/cbt/')) {
      networkLog.push(`${res.request().method()} ${url.split('/api')[1].split('?')[0]} → ${res.status()}`);
    }
  });

  // 1. Login as student
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('input[type="email"], input[placeholder*="school"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/student', { timeout: 30000 });
  console.log('✓ 1. Login OK → /dashboard/student');

  // Dismiss the onboarding wizard if it appears (first-time users)
  try {
    const skipBtn = page.locator('button:has-text("Skip onboarding for now")').first();
    await skipBtn.click({ timeout: 4000 });
    await page.waitForTimeout(2000);
    console.log('✓ 1b. Onboarding dismissed');
  } catch {
    console.log('✓ 1b. No onboarding wizard (already completed)');
  }

  // 2. Open the exam take page
  await page.goto(`${BASE}/exams/${EXAM_ID}/take`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  const preExam = await page.evaluate(() => ({
    heading: document.querySelector('h1, h2')?.textContent?.slice(0, 60),
    text: document.body.innerText.slice(0, 300),
    hasStart: !!Array.from(document.querySelectorAll('button')).find(b => /start|begin/i.test(b.textContent || '')),
    errorText: document.body.innerText.includes('not found') || document.body.innerText.includes('Failed to load'),
  }));
  console.log('✓ 2. Exam loaded:', JSON.stringify({ heading: preExam.heading, hasStart: preExam.hasStart, error: preExam.errorText }));
  if (preExam.errorText) {
    console.log('   body:', preExam.text.slice(0, 200));
  }

  // 3. Start the exam
  const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await page.waitForTimeout(4000);
    console.log('✓ 3. Exam started');
  } else {
    console.log('✗ 3. No start button found');
  }

  // 4. Answer questions — options are clickable divs containing Label text
  const answered = [];
  const answers = [
    'label:has-text("4")',      // Q1: 2+2 = 4 (option B)
    'label:has-text("Abuja")',  // Q2: capital = Abuja (option B)
    'button:has-text("True")',   // Q3: water is H2O = true (true_false renders buttons)
  ];
  for (let qi = 0; qi < answers.length; qi++) {
    try {
      const opt = page.locator(answers[qi]).first();
      await opt.click({ timeout: 5000 });
      answered.push('OK');
      await page.waitForTimeout(1000);
      if (qi < answers.length - 1) {
        const nextBtn = page.locator('button:has-text("Next")').first();
        if (await nextBtn.count() > 0) {
          await nextBtn.click();
          await page.waitForTimeout(800);
        }
      }
    } catch (e) {
      answered.push('ERR:' + String(e).slice(0, 50));
    }
  }
  console.log('✓ 4. Answers:', answered.join(','));

  // 5. Submit — opens the confirm dialog, then confirm
  try {
    const submitBtn = page.locator('button:has-text("Submit")').first();
    await submitBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    // The dialog's confirm button (inside the DialogTitle 'Submit Exam?' dialog)
    const confirmBtn = page.locator('[role="dialog"] button:has-text("Submit")').last();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click({ timeout: 5000 });
    }
    await page.waitForTimeout(8000);
    console.log('✓ 5. Submitted');
  } catch (e) {
    console.log('✗ 5. Submit failed:', String(e).slice(0, 60));
  }

  // 6. Check result
  const result = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 400),
    hasScore: /score|result|%/i.test(document.body.innerText),
  }));
  console.log('✓ 6. Result shown:', result.hasScore);
  console.log('   snippet:', result.text.replace(/\n+/g, ' | ').slice(0, 250));

  // Network log
  console.log('\n=== CBT API CALLS ===');
  networkLog.forEach(l => console.log(' ', l));

  console.log('\n=== ERRORS ===');
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? uniq.slice(0, 8).join('\n') : 'NONE');

  await browser.close();
})();
