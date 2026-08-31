// Ω-5: Extract Supabase auth cookie for a role via real UI login
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROLE = process.argv[2] || 'student';

const USERS: Record<string, { email: string; password: string }> = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
};

async function main() {
  const user = USERS[ROLE];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(800);
  await emailInput.fill(user.email);
  await page.locator('input[placeholder="Enter your password"]').first().fill(user.password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });
  await page.waitForTimeout(1500);
  const cookies = await ctx.cookies(BASE);
  const authCookies = cookies.filter((c) => c.name.includes('auth-token') || c.name.startsWith('sb-'));
  const cookieHeader = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  fs.mkdirSync('/home/z/my-project/scripts/omega/.cookies', { recursive: true });
  fs.writeFileSync(`/home/z/my-project/scripts/omega/.cookies/${ROLE}.txt`, cookieHeader);
  console.log(JSON.stringify({ role: ROLE, cookies: authCookies.map((c) => c.name), headerLen: cookieHeader.length }));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
