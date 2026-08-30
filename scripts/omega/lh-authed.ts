// Ω-5: Authenticated Lighthouse runner
// Launch Chromium with debug port, login via real UI, then run Lighthouse
// attached to the same browser (--disable-storage-reset keeps the session).
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const ROLE = process.argv[2] || 'student';
const PAGE_PATH = process.argv[3] || '/dashboard/student';
const OUTFILE = process.argv[4] || `download/verification/lighthouse/auth-${ROLE}.json`;

const USERS: Record<string, { email: string; password: string }> = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
};

async function main() {
  const user = USERS[ROLE];
  if (!user) throw new Error(`unknown role ${ROLE}`);
  const debugPort = 9333;

  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${debugPort}`, '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 } });
  const page = await ctx.newPage();

  // 1. Login through the real UI
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(800);
  await emailInput.fill(user.email);
  await page.locator('input[placeholder="Enter your password"]').first().fill(user.password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });
  await page.waitForTimeout(2500); // dashboard settles

  // 2. Run Lighthouse attached to this browser (session preserved)
  const url = `${BASE}${PAGE_PATH}`;
  fs.mkdirSync('download/verification/lighthouse', { recursive: true });
  console.log(`Running Lighthouse on ${url} ...`);
  try {
    execSync(
      `lighthouse ${url} --port=${debugPort} --disable-storage-reset --output=json --output-path=${OUTFILE} ` +
        `--chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet --max-wait-for-load=90000`,
      { stdio: 'pipe', timeout: 240_000, env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH } },
    );
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.error('LH stdout:', (err.stdout || '').toString().slice(0, 500));
    console.error('LH stderr:', (err.stderr || '').toString().slice(0, 500));
  }

  if (fs.existsSync(OUTFILE)) {
    const d = JSON.parse(fs.readFileSync(OUTFILE, 'utf8'));
    const cats = d.categories || {};
    const scores = Object.fromEntries(
      Object.entries(cats).map(([k, v]) => [k.slice(0, 4).toUpperCase(), Math.round(((v as { score: number }).score) || 0) * 100 / 100]),
    );
    const a = d.audits || {};
    const m: Record<string, number> = {};
    for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'speed-index', 'interactive']) {
      if (a[k]?.numericValue != null) m[k] = Math.round(a[k].numericValue);
    }
    console.log(JSON.stringify({ role: ROLE, page: PAGE_PATH, scores, metrics: m }, null, 1));
  } else {
    console.error('NO LIGHTHOUSE OUTPUT');
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
