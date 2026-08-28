const { chromium } = require('playwright-core');
const BASE = '[REDACTED]';
const ROLES = JSON.parse(process.argv[2]);
const ALL = {
  student: ['prod-final-1787626351@examforge-test.com', 'SecurePass123!'],
  teacher: ['e2e-teacher-1787626988@examforge-test.com', 'Teacher123!'],
  parent: ['e2e-parent-1787626988@examforge-test.com', 'Parent123!'],
  school_admin: ['e2e-schooladmin-1787626988@examforge-test.com', 'SchoolAdmin123!'],
  super_admin: ['e2e-superadmin@examforge-test.com', 'SuperAdmin123!'],
};
const ALLOWED = {
  student: ['/dashboard/student', '/exams', '/student/practice'],
  teacher: ['/dashboard/teacher', '/teacher/grading'],
  parent: ['/parent/dashboard', '/parent/child-progress'],
  school_admin: ['/dashboard/school-admin', '/admin/users'],
  super_admin: ['/dashboard/admin', '/admin/roles'],
};
const FORBIDDEN = {
  student: ['/admin/users', '/teacher/grading', '/parent/dashboard'],
  teacher: ['/admin/users', '/parent/dashboard'],
  parent: ['/admin/users', '/teacher/grading'],
  school_admin: ['/dashboard/student'],
  super_admin: [],
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
  for (const role of ROLES) {
    const [email, pass] = ALL[role];
    const page = await browser.newPage();
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"], input[placeholder*="school"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(5000);
    console.log(`\n[${role}] → ${page.url().replace(BASE, '')}`);
    for (const p of ALLOWED[role]) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const url = page.url().replace(BASE, '');
      const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
      console.log(`  OK? ${p} → ${url} (${len}ch) ${!url.startsWith('/login') && len > 50 ? '✓' : '✗'}`);
    }
    for (const p of FORBIDDEN[role]) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const url = page.url().replace(BASE, '');
      console.log(`  DENY ${p} → ${url} ${!url.startsWith(p) ? '✓' : '✗ LEAK'}`);
    }
    await page.close();
  }
  await browser.close();
})();
