// RC1 PHASE 19 — PRODUCTION AI TRACKING VERIFICATION
// Chain: super_admin seeds plan catalog → teacher requests AI generation on PROD
// → DB row verified separately via Management API (ai-tracking-prod-db.js).
// Also exercises GET /api/ai/usage (school_admin analytics surface).
import { chromium } from '@playwright/test';

const PROD = process.env.PROD_BASE || 'https://web-alpha-bay-87.vercel.app';

async function login(page, email, password) {
  await page.goto(PROD + '/login', { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  await emailInput.fill(email);
  await page.locator('input[placeholder="Enter your password"]').first().fill(password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  return page.url();
}

async function getCsrf(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/csrf');
    const j = await r.json().catch(() => null);
    return { status: r.status, token: j?.token ?? null };
  });
}

(async () => {
  const out = { prod: PROD, steps: [] };
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // ── Step 1: super_admin seeds the plan catalog ──
  const suPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const suUrl = await login(suPage, 'e2e-superadmin@examforge-test.com', 'SuperAdmin123!');
  console.log('1. super_admin login →', suUrl);
  out.steps.push({ step: 'super_admin login', ok: !suUrl.includes('/login') });

  const csrf1 = await getCsrf(suPage);
  console.log('2. csrf GET →', csrf1.status, csrf1.token ? 'token-ok' : 'NO TOKEN');
  const seed = await suPage.evaluate(async (token) => {
    const r = await fetch('/api/admin/seed-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    });
    return { status: r.status, body: (await r.text()).slice(0, 400) };
  }, csrf1.token);
  console.log('3. seed-plans POST →', seed.status, seed.body.slice(0, 200));
  out.steps.push({ step: 'seed plans', ok: seed.status < 300, detail: seed });
  await suPage.close();

  // ── Step 2: school_admin usage analytics surface (200 + payload) ──
  const saPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(saPage, 'e2e-schooladmin-1787626988@examforge-test.com', 'SchoolAdmin123!');
  const usage = await saPage.evaluate(async () => {
    const r = await fetch('/api/ai/usage');
    return { status: r.status, body: (await r.text()).slice(0, 500) };
  });
  console.log('4. GET /api/ai/usage (school_admin) →', usage.status, usage.body.slice(0, 300));
  out.steps.push({ step: 'ai usage analytics', ok: usage.status === 200, detail: usage });
  await saPage.close();

  // ── Step 3: teacher triggers a real AI generation ──
  const tPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const tUrl = await login(tPage, 'e2e-teacher-1787626988@examforge-test.com', 'Teacher123!');
  console.log('5. teacher login →', tUrl);
  const csrf2 = await getCsrf(tPage);
  const ai = await tPage.evaluate(async (token) => {
    const r = await fetch('/api/ai/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({
        action: 'generate-questions',
        data: {
          topic: 'Photosynthesis basics',
          subject: 'Biology',
          gradeLevel: 'SS2',
          questionCount: 3,
          difficulty: 'medium',
          questionTypes: ['multiple-choice'],
        },
      }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 500) };
  }, csrf2.token);
  console.log('6. POST /api/ai/teacher generate-questions →', ai.status, ai.body.slice(0, 300));
  out.steps.push({ step: 'teacher AI generation', ok: ai.status < 500, detail: ai });
  await tPage.close();

  await browser.close();
  require('fs').writeFileSync('/home/z/my-project/download/verification/omega-local/ai-tracking-prod.json',
    JSON.stringify({ timestamp: new Date().toISOString(), ...out }, null, 1));
  console.log('saved: download/verification/omega-local/ai-tracking-prod.json');
})();
