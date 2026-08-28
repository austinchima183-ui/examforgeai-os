const { chromium } = require('playwright-core');
const BASE = '[REDACTED]';
const ROLES = [
  ['student', 'prod-final-1787626351@examforge-test.com', 'SecurePass123!', '/dashboard/student'],
  ['teacher', 'e2e-teacher-1787626988@examforge-test.com', 'Teacher123!', '/dashboard/teacher'],
  ['parent', 'e2e-parent-1787626988@examforge-test.com', 'Parent123!', '/parent/dashboard'],
  ['school_admin', 'e2e-schooladmin-1787626988@examforge-test.com', 'SchoolAdmin123!', '/dashboard/school-admin'],
  ['super_admin', 'e2e-superadmin@examforge-test.com', 'SuperAdmin123!', '/dashboard/super-admin'],
];
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  for (const [role, email, pass, dash] of ROLES) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(String(err).slice(0, 60)));
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"], input[placeholder*="school"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(6000);
    const url = page.url().replace(BASE, '');
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.slice(0, 40),
      textLen: document.body.innerText.length,
      navItems: document.querySelectorAll('[data-nav-item]').length,
    }));
    console.log(`${role.padEnd(13)} → ${url.padEnd(25)} h1="${info.h1}" text=${info.textLen}ch nav=${info.navItems} errors=${errors.length}`);
    await page.close();
  }
  await browser.close();
})();
